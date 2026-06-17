import { Op } from 'sequelize';
import { Ticket, TicketComment, TicketHistory, User } from '../database/models';
import { NotFoundError } from '../utils/errors';

interface CreateTicketData {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  requestedBy: number;
}

interface UpdateTicketData {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: number | null;
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

export class TicketService {
  async create(data: CreateTicketData): Promise<Ticket> {
    const ticket = await Ticket.create({
      title: data.title,
      description: data.description,
      priority: data.priority || 'medium',
      status: 'pending',
      requestedBy: data.requestedBy,
    });

    await TicketHistory.create({
      ticketId: ticket.id,
      userId: data.requestedBy,
      field: 'status',
      newValue: 'pending',
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

  async update(id: number, data: UpdateTicketData, userId: number): Promise<Ticket> {
    const ticket = await Ticket.findByPk(id);
    if (!ticket) throw new NotFoundError('Ticket');

    const changes: Array<{ field: string; oldValue: string | null; newValue: string }> = [];

    if (data.title && data.title !== ticket.title) {
      changes.push({ field: 'title', oldValue: ticket.title, newValue: data.title });
    }
    if (data.status && data.status !== ticket.status) {
      changes.push({ field: 'status', oldValue: ticket.status, newValue: data.status });
    }
    if (data.priority && data.priority !== ticket.priority) {
      changes.push({ field: 'priority', oldValue: ticket.priority, newValue: data.priority });
    }
    if (data.assignedTo !== undefined && data.assignedTo !== ticket.assignedTo) {
      const oldVal = ticket.assignedTo ? String(ticket.assignedTo) : 'unassigned';
      const newVal = data.assignedTo ? String(data.assignedTo) : 'unassigned';
      changes.push({ field: 'assignedTo', oldValue: oldVal, newValue: newVal });
    }

    const updateData: any = { ...data };
    if (data.status === 'resolved' && ticket.status !== 'resolved') {
      updateData.resolutionDate = new Date();
    }

    await ticket.update(updateData);

    for (const change of changes) {
      await TicketHistory.create({
        ticketId: id,
        userId,
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
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

    return TicketComment.create({
      ticketId,
      userId,
      comment,
    });
  }

  async getDashboardStats() {
    const totalTickets = await Ticket.count();
    const openTickets = await Ticket.count({ where: { status: { [Op.in]: ['pending', 'in_progress'] } } });
    const closedTickets = await Ticket.count({ where: { status: 'closed' } });
    const byPriority = {
      low: await Ticket.count({ where: { priority: 'low', status: { [Op.ne]: 'closed' } } }),
      medium: await Ticket.count({ where: { priority: 'medium', status: { [Op.ne]: 'closed' } } }),
      high: await Ticket.count({ where: { priority: 'high', status: { [Op.ne]: 'closed' } } }),
      critical: await Ticket.count({ where: { priority: 'critical', status: { [Op.ne]: 'closed' } } }),
    };

    return { totalTickets, openTickets, closedTickets, byPriority };
  }
}
