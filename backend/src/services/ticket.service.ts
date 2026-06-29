import { literal, Op } from 'sequelize';
import { AuditLog, Ticket, TicketComment, TicketHistory, User } from '../database/models';
import { TicketPriority, TicketStatus } from '../database/models/Ticket';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { AuthPayload } from '../middlewares/auth';
import { InstitutionalArea } from '../constants/institutionalAreas';

interface CreateTicketData {
  title: string;
  description: string;
  category: string;
  location: InstitutionalArea;
  attachments?: string[];
  requestedBy: number;
  ipAddress?: string | null;
}

interface UpdateTicketData {
  title?: string;
  description?: string;
  category?: string;
  location?: InstitutionalArea;
  attachments?: string[];
  status?: TicketStatus;
  priority?: TicketPriority | null;
  assignedTo?: number | null;
  comment?: string;
  diagnosis?: string;
  solution?: string;
}

interface PaginationParams {
  page: number;
  limit: number;
  status?: string;
  priority?: string;
  location?: InstitutionalArea;
  search?: string;
  requestedBy?: number;
  assignedTo?: number;
  unassigned?: boolean;
}

interface TicketActionContext {
  userId: number;
  role: AuthPayload['role'];
  ipAddress?: string | null;
}

const technicianStatuses: TicketStatus[] = ['pending', 'in_progress', 'resolved'];

function historyValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'sin definir';
  return String(value);
}

export class TicketService {
  async create(data: CreateTicketData): Promise<Ticket> {
    const ticket = await Ticket.create({
      title: data.title,
      description: data.description,
      category: data.category,
      location: data.location,
      attachments: data.attachments || [],
      priority: null,
      status: 'pending',
      requestedBy: data.requestedBy,
    });

    await this.createHistory({
      ticketId: ticket.id,
      userId: data.requestedBy,
      actorRole: 'user',
      action: 'ticket_created',
      field: 'status',
      newValue: 'pending',
      newStatus: 'pending',
      comment: 'Ticket creado por el usuario final',
    });

    await this.createAudit({
      userId: data.requestedBy,
      action: 'ticket_created',
      entity: 'ticket',
      entityId: ticket.id,
      ipAddress: data.ipAddress,
      newData: {
        title: ticket.title,
        description: ticket.description,
        category: ticket.category,
        location: ticket.location,
        attachments: ticket.attachments,
        status: ticket.status,
        requestedBy: ticket.requestedBy,
      },
    });

    return this.findById(ticket.id);
  }

  async findAll(params: PaginationParams) {
    const { page, limit, status, priority, location, search } = params;
    const offset = (page - 1) * limit;

    const where: any = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (location) where.location = location;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (params.requestedBy) where.requestedBy = params.requestedBy;
    if (params.assignedTo) where.assignedTo = params.assignedTo;
    if (params.unassigned) where.assignedTo = null;

    const order = [
      [literal(`CASE WHEN "Ticket"."status" = 'resolved' THEN 1 ELSE 0 END`), 'ASC'],
      [literal(`CASE "Ticket"."priority" WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END`), 'ASC'],
      ['createdAt', 'DESC'],
    ];

    const { rows, count } = await Ticket.findAndCountAll({
      where,
      offset,
      limit,
      include: [
        { model: User, as: 'requester', attributes: ['id', 'name', 'email', 'area'] },
        { model: User, as: 'technician', attributes: ['id', 'name', 'email', 'area'] },
      ],
      order: order as any,
    });

    return { tickets: rows, total: count };
  }

  async findById(id: number): Promise<Ticket> {
    const ticket = await Ticket.findByPk(id, {
      include: [
        { model: User, as: 'requester', attributes: ['id', 'name', 'email', 'area'] },
        { model: User, as: 'technician', attributes: ['id', 'name', 'email', 'area'] },
        {
          model: TicketComment,
          as: 'comments',
          include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email'] }],
          order: [['createdAt', 'ASC']],
        },
        {
          model: TicketHistory,
          as: 'histories',
          include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email'] }],
        },
      ],
      order: [
        [{ model: TicketHistory, as: 'histories' }, 'createdAt', 'DESC'],
        [{ model: TicketComment, as: 'comments' }, 'createdAt', 'ASC'],
      ],
    });

    if (!ticket) throw new NotFoundError('Ticket');
    return ticket;
  }

  async update(id: number, data: UpdateTicketData, actor: TicketActionContext): Promise<Ticket> {
    const ticket = await Ticket.findByPk(id);
    if (!ticket) throw new NotFoundError('Ticket');
    await this.ensureCanModify(ticket, actor, data);

    const changes: Array<{ field: string; oldValue: string | null; newValue: string }> = [];

    if (data.title && data.title !== ticket.title) {
      changes.push({ field: 'title', oldValue: ticket.title, newValue: data.title });
    }
    if (data.description && data.description !== ticket.description) {
      changes.push({ field: 'description', oldValue: ticket.description, newValue: data.description });
    }
    if (data.category && data.category !== ticket.category) {
      changes.push({ field: 'category', oldValue: ticket.category, newValue: data.category });
    }
    if (data.location && data.location !== ticket.location) {
      changes.push({ field: 'location', oldValue: ticket.location, newValue: data.location });
    }
    if (data.attachments !== undefined && JSON.stringify(data.attachments) !== JSON.stringify(ticket.attachments || [])) {
      changes.push({ field: 'attachments', oldValue: JSON.stringify(ticket.attachments || []), newValue: JSON.stringify(data.attachments) });
    }
    if (data.status && data.status !== ticket.status) {
      changes.push({ field: 'status', oldValue: ticket.status, newValue: data.status });
    }
    if (data.priority !== undefined && data.priority !== ticket.priority) {
      changes.push({ field: 'priority', oldValue: ticket.priority, newValue: historyValue(data.priority) });
    }
    if (data.assignedTo !== undefined && data.assignedTo !== ticket.assignedTo) {
      const oldVal = ticket.assignedTo ? String(ticket.assignedTo) : 'sin asignar';
      const newVal = data.assignedTo ? String(data.assignedTo) : 'sin asignar';
      changes.push({ field: 'assignedTo', oldValue: oldVal, newValue: newVal });
    }

    const updateData: any = { ...data };
    if (data.status === 'resolved' && ticket.status !== 'resolved') {
      updateData.resolutionDate = new Date();
    }
    await ticket.update(updateData);

    for (const change of changes) {
      await this.createHistory({
        ticketId: id,
        userId: actor.userId,
        actorRole: actor.role,
        action: this.resolveHistoryAction(change.field, ticket, data),
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        previousStatus: change.field === 'status' ? change.oldValue : ticket.status,
        newStatus: change.field === 'status' ? change.newValue : updateData.status || ticket.status,
        assignedTechnicianId: updateData.assignedTo ?? ticket.assignedTo ?? null,
        priority: updateData.priority ?? ticket.priority ?? null,
        comment: data.comment || data.diagnosis || undefined,
        solution: data.solution,
      });
    }

    if (changes.length > 0) {
      await this.createAudit({
        userId: actor.userId,
        action: 'ticket_updated',
        entity: 'ticket',
        entityId: id,
        ipAddress: actor.ipAddress,
        oldData: changes.reduce<Record<string, unknown>>((acc, change) => {
          acc[change.field] = change.oldValue;
          return acc;
        }, {}),
        newData: changes.reduce<Record<string, unknown>>((acc, change) => {
          acc[change.field] = change.newValue;
          return acc;
        }, {}),
      });
    }

    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    const ticket = await Ticket.findByPk(id);
    if (!ticket) throw new NotFoundError('Ticket');
    throw new ForbiddenError('Los tickets no se eliminan porque se debe conservar la trazabilidad histórica');
  }

  async addComment(ticketId: number, userId: number, comment: string, ipAddress?: string | null): Promise<TicketComment> {
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) throw new NotFoundError('Ticket');

    const created = await TicketComment.create({
      ticketId,
      userId,
      comment,
    });

    const user = await User.findByPk(userId);
    await this.createHistory({
      ticketId,
      userId,
      actorRole: user?.role || null,
      action: 'comment_added',
      field: 'comment',
      oldValue: null,
      newValue: comment.slice(0, 255),
      previousStatus: ticket.status,
      newStatus: ticket.status,
      assignedTechnicianId: ticket.assignedTo,
      priority: ticket.priority,
      comment,
    });

    await this.createAudit({
      userId,
      action: 'ticket_comment_added',
      entity: 'ticket',
      entityId: ticketId,
      ipAddress,
      newData: { comment },
    });

    return created;
  }

  async assign(id: number, assignedTo: number, priority: TicketPriority | null, actor: TicketActionContext) {
    if (actor.role !== 'admin') throw new ForbiddenError('Solo los administradores pueden asignar tickets');
    return this.update(id, { assignedTo, priority }, actor);
  }

  async setPriority(id: number, priority: TicketPriority, actor: TicketActionContext) {
    if (actor.role !== 'admin') throw new ForbiddenError('Solo los administradores pueden definir la prioridad');
    return this.update(id, { priority }, actor);
  }

  async changeStatus(id: number, status: TicketStatus, actor: TicketActionContext, comment?: string) {
    return this.update(id, { status, comment }, actor);
  }

  async addFollowUp(id: number, actor: TicketActionContext, payload: { comment?: string; diagnosis?: string; solution?: string }) {
    const ticket = await Ticket.findByPk(id);
    if (!ticket) throw new NotFoundError('Ticket');
    await this.ensureCanAccess(ticket, actor);

    const action = payload.solution
      ? 'solution_registered'
      : payload.diagnosis
        ? 'diagnosis_registered'
        : 'follow_up_added';
    const comment = payload.solution || payload.diagnosis || payload.comment || '';

    await this.createHistory({
      ticketId: id,
      userId: actor.userId,
      actorRole: actor.role,
      action,
      field: action,
      oldValue: null,
      newValue: comment.slice(0, 255) || action,
      previousStatus: ticket.status,
      newStatus: ticket.status,
      assignedTechnicianId: ticket.assignedTo,
      priority: ticket.priority,
      comment: payload.comment || payload.diagnosis,
      solution: payload.solution,
    });

    return this.findById(id);
  }

  async resolve(id: number, actor: TicketActionContext, solution: string) {
    await this.addFollowUp(id, actor, { solution });
    return this.update(id, { status: 'resolved', solution }, actor);
  }

  async close(id: number, actor: TicketActionContext, comment?: string) {
    if (actor.role !== 'admin') throw new ForbiddenError('Solo los administradores pueden cerrar tickets');
    return this.update(id, { status: 'resolved', comment }, actor);
  }

  async getDashboardStats() {
    const totalTickets = await Ticket.count();
    const openTickets = await Ticket.count({ where: { status: { [Op.in]: ['pending', 'in_progress'] } } });
    const closedTickets = await Ticket.count({ where: { status: 'resolved' } });
    const byPriority = {
      low: await Ticket.count({ where: { priority: 'low', status: { [Op.ne]: 'resolved' } } }),
      medium: await Ticket.count({ where: { priority: 'medium', status: { [Op.ne]: 'resolved' } } }),
      high: await Ticket.count({ where: { priority: 'high', status: { [Op.ne]: 'resolved' } } }),
      critical: await Ticket.count({ where: { priority: 'critical', status: { [Op.ne]: 'resolved' } } }),
    };

    return { totalTickets, openTickets, closedTickets, byPriority };
  }

  private async ensureCanAccess(ticket: Ticket, actor: TicketActionContext) {
    if (actor.role === 'user' && ticket.requestedBy !== actor.userId) {
      throw new ForbiddenError('Solo puedes acceder a tus propios tickets');
    }
    if (actor.role === 'technician' && ticket.assignedTo !== actor.userId) {
      throw new ForbiddenError('Los técnicos solo pueden trabajar tickets asignados');
    }
  }

  private async ensureCanModify(ticket: Ticket, actor: TicketActionContext, data: UpdateTicketData) {
    await this.ensureCanAccess(ticket, actor);
    if (actor.role === 'user') {
      throw new ForbiddenError('Los usuarios no pueden modificar tickets después de crearlos');
    }
    if (actor.role === 'technician') {
      if (data.priority !== undefined || data.assignedTo !== undefined || data.title || data.description) {
        throw new ForbiddenError('Los técnicos no pueden asignar tickets ni modificar la prioridad');
      }
      if (data.status && !technicianStatuses.includes(data.status)) {
        throw new ForbiddenError('Los técnicos no pueden establecer ese estado');
      }
    }
    if (data.status && data.status !== ticket.status) {
      this.ensureValidStatusTransition(ticket.status, data.status, actor.role);
    }
  }

  private ensureValidStatusTransition(current: TicketStatus, next: TicketStatus, role: AuthPayload['role']) {
    if (!technicianStatuses.includes(current) || !technicianStatuses.includes(next)) {
      throw new ForbiddenError('Estado de ticket no válido');
    }
    if (role !== 'admin' && role !== 'technician') {
      throw new ForbiddenError('No puedes cambiar el estado del ticket');
    }
  }

  private resolveHistoryAction(field: string, ticket: Ticket, data: UpdateTicketData) {
    if (field === 'assignedTo' && ticket.assignedTo && data.assignedTo && ticket.assignedTo !== data.assignedTo) return 'ticket_reassigned';
    if (field === 'assignedTo') return 'ticket_assigned';
    if (field === 'priority') return 'priority_defined';
    if (field === 'status' && data.status === 'resolved') return 'ticket_resolved';
    return 'status_updated';
  }

  private createHistory(data: any) {
    return TicketHistory.create(data);
  }

  private createAudit(data: {
    userId: number;
    action: string;
    entity: string;
    entityId?: number | null;
    ipAddress?: string | null;
    oldData?: Record<string, unknown> | null;
    newData?: Record<string, unknown> | null;
  }) {
    return AuditLog.create({
      userId: data.userId,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId ?? null,
      ipAddress: data.ipAddress ?? null,
      oldData: data.oldData ?? null,
      newData: data.newData ?? null,
    });
  }
}
