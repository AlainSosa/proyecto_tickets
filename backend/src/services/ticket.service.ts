import { Op } from 'sequelize';
import { Ticket, TicketComment, TicketHistory, User } from '../database/models';
import { TicketPriority, TicketStatus } from '../database/models/Ticket';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { AuthPayload } from '../middlewares/auth';

interface CreateTicketData {
  title: string;
  description: string;
  requestedBy: number;
}

interface UpdateTicketData {
  title?: string;
  description?: string;
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
  search?: string;
  requestedBy?: number;
  assignedTo?: number;
}

interface TicketActionContext {
  userId: number;
  role: AuthPayload['role'];
}

const technicianStatuses: TicketStatus[] = ['assigned', 'in_progress', 'on_hold', 'resolved'];

function historyValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'sin definir';
  return String(value);
}

export class TicketService {
  async create(data: CreateTicketData): Promise<Ticket> {
    const ticket = await Ticket.create({
      title: data.title,
      description: data.description,
      priority: null,
      status: 'pending_assignment',
      requestedBy: data.requestedBy,
    });

    await this.createHistory({
      ticketId: ticket.id,
      userId: data.requestedBy,
      actorRole: 'user',
      action: 'ticket_created',
      field: 'status',
      newValue: 'pending_assignment',
      newStatus: 'pending_assignment',
      comment: 'Ticket creado por el usuario final',
    });

    return this.findById(ticket.id);
  }

  async findAll(params: PaginationParams) {
    const { page, limit, status, priority, search } = params;
    const offset = (page - 1) * limit;

    const where: any = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (params.requestedBy) where.requestedBy = params.requestedBy;
    if (params.assignedTo) where.assignedTo = params.assignedTo;

    const { rows, count } = await Ticket.findAndCountAll({
      where,
      offset,
      limit,
      include: [
        { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'technician', attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    return { tickets: rows, total: count };
  }

  async findById(id: number): Promise<Ticket> {
    const ticket = await Ticket.findByPk(id, {
      include: [
        { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'technician', attributes: ['id', 'name', 'email'] },
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
          order: [['createdAt', 'ASC']],
        },
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
    if (data.assignedTo && !data.status && ticket.status === 'pending_assignment') {
      updateData.status = 'assigned';
      changes.push({ field: 'status', oldValue: ticket.status, newValue: 'assigned' });
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

    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    const ticket = await Ticket.findByPk(id);
    if (!ticket) throw new NotFoundError('Ticket');
    await ticket.destroy();
  }

  async addComment(ticketId: number, userId: number, comment: string): Promise<TicketComment> {
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

    return created;
  }

  async assign(id: number, assignedTo: number, priority: TicketPriority | null, actor: TicketActionContext) {
    if (actor.role !== 'admin') throw new ForbiddenError('Only administrators can assign tickets');
    return this.update(id, { assignedTo, priority, status: 'assigned' }, actor);
  }

  async setPriority(id: number, priority: TicketPriority, actor: TicketActionContext) {
    if (actor.role !== 'admin') throw new ForbiddenError('Only administrators can define priority');
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
    if (actor.role !== 'admin') throw new ForbiddenError('Only administrators can close tickets');
    return this.update(id, { status: 'closed', comment }, actor);
  }

  async getDashboardStats() {
    const totalTickets = await Ticket.count();
    const openTickets = await Ticket.count({ where: { status: { [Op.in]: ['open', 'pending_assignment', 'assigned', 'in_progress', 'on_hold', 'pending'] } } });
    const closedTickets = await Ticket.count({ where: { status: 'closed' } });
    const byPriority = {
      low: await Ticket.count({ where: { priority: 'low', status: { [Op.ne]: 'closed' } } }),
      medium: await Ticket.count({ where: { priority: 'medium', status: { [Op.ne]: 'closed' } } }),
      high: await Ticket.count({ where: { priority: 'high', status: { [Op.ne]: 'closed' } } }),
      critical: await Ticket.count({ where: { priority: 'critical', status: { [Op.ne]: 'closed' } } }),
    };

    return { totalTickets, openTickets, closedTickets, byPriority };
  }

  private async ensureCanAccess(ticket: Ticket, actor: TicketActionContext) {
    if (actor.role === 'user' && ticket.requestedBy !== actor.userId) {
      throw new ForbiddenError('You can only access your own tickets');
    }
    if (actor.role === 'technician' && ticket.assignedTo !== actor.userId) {
      throw new ForbiddenError('Technicians can only work assigned tickets');
    }
  }

  private async ensureCanModify(ticket: Ticket, actor: TicketActionContext, data: UpdateTicketData) {
    await this.ensureCanAccess(ticket, actor);
    if (actor.role === 'user') {
      throw new ForbiddenError('Users cannot modify tickets after creation');
    }
    if (actor.role === 'technician') {
      if (data.priority !== undefined || data.assignedTo !== undefined || data.title || data.description) {
        throw new ForbiddenError('Technicians cannot assign tickets or modify priority');
      }
      if (data.status && !technicianStatuses.includes(data.status)) {
        throw new ForbiddenError('Technicians cannot set that status');
      }
    }
  }

  private resolveHistoryAction(field: string, ticket: Ticket, data: UpdateTicketData) {
    if (field === 'assignedTo' && ticket.assignedTo && data.assignedTo && ticket.assignedTo !== data.assignedTo) return 'ticket_reassigned';
    if (field === 'assignedTo') return 'ticket_assigned';
    if (field === 'priority') return 'priority_defined';
    if (field === 'status' && data.status === 'resolved') return 'ticket_resolved';
    if (field === 'status' && data.status === 'closed') return 'ticket_closed';
    return 'status_updated';
  }

  private createHistory(data: any) {
    return TicketHistory.create(data);
  }
}
