import { Op } from 'sequelize';
import { Asset, NetworkPoint, Ticket, User } from '../database/models';
import { INSTITUTIONAL_AREAS } from '../constants/institutionalAreas';

type TicketStatus = 'pending' | 'in_progress' | 'resolved';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
interface DateRange {
  dateFrom?: Date;
  dateTo?: Date;
}

const STATUS_VALUES: TicketStatus[] = ['pending', 'in_progress', 'resolved'];
const OPEN_STATUS_VALUES: TicketStatus[] = ['pending', 'in_progress'];
const CATEGORY_VALUES = ['Red', 'Impresoras', 'Computadoras', 'Telefonía', 'Correo', 'Software', 'Otros'];

function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}

function ticketDateWhere(range?: DateRange) {
  if (!range?.dateFrom || !range?.dateTo) return {};
  return { createdAt: { [Op.gte]: range.dateFrom, [Op.lt]: range.dateTo } };
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function inferCategory(ticket: Pick<Ticket, 'title' | 'description'>): string {
  const text = normalizeText(`${ticket.title} ${ticket.description}`);

  if (/(red|wifi|internet|switch|router|patch|punto de red|network|lan|vpn)/.test(text)) return 'Red';
  if (/(impresora|printer|toner|scanner|escáner|escaner)/.test(text)) return 'Impresoras';
  if (/(computadora|equipo|pc|laptop|monitor|teclado|mouse|cpu)/.test(text)) return 'Computadoras';
  if (/(telefono|telefonia|extensión|extension|ramal|ip phone|voip)/.test(text)) return 'Telefonía';
  if (/(correo|email|mail|outlook|gmail|buzon|buzón)/.test(text)) return 'Correo';
  if (/(software|sistema|aplicacion|aplicación|programa|licencia|office|windows)/.test(text)) return 'Software';

  return 'Otros';
}

export class DashboardService {
  async getSummary(range?: DateRange) {
    const currentMonth = startOfMonth();
    const nextMonth = addMonths(currentMonth, 1);
    const createdAtWhere = ticketDateWhere(range);
    const resolvedDateWhere = range?.dateFrom && range?.dateTo
      ? { resolutionDate: { [Op.gte]: range.dateFrom, [Op.lt]: range.dateTo } }
      : { resolutionDate: { [Op.gte]: currentMonth, [Op.lt]: nextMonth } };

    const [
      totalTickets,
      pendingTickets,
      assignedTickets,
      inProgressTickets,
      onHoldTickets,
      resolvedTickets,
      closedTickets,
      criticalTickets,
      resolvedThisMonth,
      totalAssets,
      assetsInMaintenance,
      totalNetworkPoints,
      inactiveNetworkPoints,
    ] = await Promise.all([
      Ticket.count({ where: createdAtWhere }),
      Ticket.count({ where: { ...createdAtWhere, status: 'pending' } }),
      Ticket.count({ where: { ...createdAtWhere, status: 'pending', assignedTo: { [Op.ne]: null } } }),
      Ticket.count({ where: { ...createdAtWhere, status: 'in_progress' } }),
      Promise.resolve(0),
      Ticket.count({ where: { ...createdAtWhere, status: 'resolved' } }),
      Promise.resolve(0),
      Ticket.count({
        where: {
          ...createdAtWhere,
          priority: { [Op.in]: ['high', 'critical'] as TicketPriority[] },
          status: { [Op.ne]: 'resolved' },
        },
      }),
      Ticket.count({
        where: {
          status: 'resolved',
          ...resolvedDateWhere,
        },
      }),
      Asset.count(),
      Asset.count({ where: { status: 'maintenance' } }),
      NetworkPoint.count(),
      NetworkPoint.count({ where: { status: 'inactive' } }),
    ]);

    return {
      totalTickets,
      openTickets: pendingTickets + inProgressTickets,
      pendingTickets,
      assignedTickets,
      inProgressTickets,
      onHoldTickets,
      resolvedTickets,
      closedTickets,
      criticalTickets,
      resolvedThisMonth,
      byPriority: await this.getTicketsByPriority(range),
      totalAssets,
      assetsInMaintenance,
      totalNetworkPoints,
      inactiveNetworkPoints,
    };
  }

  async getTicketsByStatus(range?: DateRange) {
    const createdAtWhere = ticketDateWhere(range);
    const counts = await Promise.all(
      STATUS_VALUES.map(async (status) => ({
        status,
        value: await Ticket.count({ where: { ...createdAtWhere, status } }),
      }))
    );

    return counts;
  }

  async getTicketsByMonth(range?: DateRange) {
    const firstMonth = range?.dateFrom ? startOfMonth(range.dateFrom) : addMonths(startOfMonth(), -5);
    const lastMonth = range?.dateTo ? startOfMonth(new Date(range.dateTo.getTime() - 1)) : startOfMonth();
    const tickets = await Ticket.findAll({
      attributes: ['id', 'createdAt'],
      where: range?.dateFrom && range?.dateTo
        ? { createdAt: { [Op.gte]: range.dateFrom, [Op.lt]: range.dateTo } }
        : { createdAt: { [Op.gte]: firstMonth } },
      order: [['createdAt', 'ASC']],
    });

    const buckets = new Map<string, { month: string; label: string; value: number }>();
    const monthCount = range?.dateFrom && range?.dateTo
      ? Math.max(1, (lastMonth.getFullYear() - firstMonth.getFullYear()) * 12 + lastMonth.getMonth() - firstMonth.getMonth() + 1)
      : 6;
    for (let index = 0; index < monthCount; index += 1) {
      const date = addMonths(firstMonth, index);
      buckets.set(monthKey(date), { month: monthKey(date), label: monthLabel(date), value: 0 });
    }

    for (const ticket of tickets) {
      const createdAt = new Date(ticket.createdAt);
      const key = monthKey(createdAt);
      const bucket = buckets.get(key);
      if (bucket) bucket.value += 1;
    }

    return Array.from(buckets.values());
  }

  async getTicketsByCategory(range?: DateRange) {
    const tickets = await Ticket.findAll({
      attributes: ['id', 'title', 'description', 'category'],
      where: ticketDateWhere(range),
    });

    const counts = new Map(CATEGORY_VALUES.map((category) => [category, 0]));
    for (const ticket of tickets) {
      const category = ticket.category || inferCategory(ticket);
      counts.set(category, (counts.get(category) || 0) + 1);
    }

    return CATEGORY_VALUES.map((category) => ({
      category,
      value: counts.get(category) || 0,
    }));
  }

  async getTicketsByArea(range?: DateRange) {
    const createdAtWhere = ticketDateWhere(range);
    return Promise.all(
      INSTITUTIONAL_AREAS.map(async (area) => ({
        area,
        value: await Ticket.count({ where: { ...createdAtWhere, location: area } }),
      }))
    );
  }

  async getTicketsByPriority(range?: DateRange) {
    const createdAtWhere = ticketDateWhere(range);
    const priorities: TicketPriority[] = ['low', 'medium', 'high', 'critical'];
    const entries = await Promise.all(
      priorities.map(async (priority) => [priority, await Ticket.count({ where: { ...createdAtWhere, priority } })])
    );

    return Object.fromEntries(entries) as Record<TicketPriority, number>;
  }

  async getTechnicianMetrics(range?: DateRange): Promise<Array<{
    technicianId: number;
    technicianName: string;
    assignedTickets: number;
    resolvedTickets: number;
    averageResolutionHours: number;
  }>> {
    const technicians = await User.findAll({
      where: { role: 'technician' },
      attributes: ['id', 'name', 'email'],
      include: [{
        model: Ticket,
        as: 'assignedTickets',
        attributes: ['id', 'status', 'createdAt', 'resolutionDate'],
        where: ticketDateWhere(range),
        required: false,
      }],
      order: [['name', 'ASC']],
    });

    return technicians.map((technician) => {
      const tickets = (technician as any).assignedTickets as Ticket[] || [];
      const resolved = tickets.filter((ticket) => ticket.status === 'resolved');
      const resolutionHours = resolved
        .filter((ticket) => ticket.resolutionDate)
        .map((ticket) => (new Date(ticket.resolutionDate!).getTime() - new Date(ticket.createdAt).getTime()) / 36e5);
      const averageResolutionHours = resolutionHours.length
        ? Number((resolutionHours.reduce((sum, value) => sum + value, 0) / resolutionHours.length).toFixed(1))
        : 0;

      return {
        technicianId: technician.id,
        technicianName: technician.name,
        assignedTickets: tickets.length,
        resolvedTickets: resolved.length,
        averageResolutionHours,
      };
    });
  }

  async getResolutionTrend(range?: DateRange) {
    const firstMonth = range?.dateFrom ? startOfMonth(range.dateFrom) : addMonths(startOfMonth(), -5);
    const lastMonth = range?.dateTo ? startOfMonth(new Date(range.dateTo.getTime() - 1)) : startOfMonth();
    const tickets = await Ticket.findAll({
      attributes: ['id', 'resolutionDate'],
      where: {
        resolutionDate: range?.dateFrom && range?.dateTo
          ? { [Op.gte]: range.dateFrom, [Op.lt]: range.dateTo }
          : { [Op.gte]: firstMonth },
        status: 'resolved',
      },
      order: [['resolutionDate', 'ASC']],
    });

    const buckets = new Map<string, { month: string; label: string; value: number }>();
    const monthCount = (lastMonth.getFullYear() - firstMonth.getFullYear()) * 12 + lastMonth.getMonth() - firstMonth.getMonth() + 1;
    for (let index = 0; index < monthCount; index += 1) {
      const date = addMonths(firstMonth, index);
      buckets.set(monthKey(date), { month: monthKey(date), label: monthLabel(date), value: 0 });
    }

    for (const ticket of tickets) {
      if (!ticket.resolutionDate) continue;
      const key = monthKey(new Date(ticket.resolutionDate));
      const bucket = buckets.get(key);
      if (bucket) bucket.value += 1;
    }

    return Array.from(buckets.values());
  }

  async getRecentTickets(range?: DateRange) {
    return Ticket.findAll({
      limit: 8,
      where: ticketDateWhere(range),
      include: [
        { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'technician', attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async getCriticalTickets(range?: DateRange) {
    return Ticket.findAll({
      limit: 8,
      where: {
        ...ticketDateWhere(range),
        priority: { [Op.in]: ['high', 'critical'] as TicketPriority[] },
        status: { [Op.ne]: 'resolved' },
      },
      include: [
        { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'technician', attributes: ['id', 'name', 'email'] },
      ],
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });
  }

  async getMaintenanceAssets() {
    return Asset.findAll({
      limit: 8,
      where: { status: 'maintenance' },
      include: [{ model: User, as: 'assignedUser', attributes: ['id', 'name', 'email'] }],
      order: [['updatedAt', 'DESC']],
    });
  }

  async getInactiveNetworkPoints() {
    return NetworkPoint.findAll({
      limit: 8,
      where: { status: 'inactive' },
      include: [{ model: Asset, as: 'switch', attributes: ['id', 'internalCode', 'brand', 'model'] }],
      order: [['updatedAt', 'DESC']],
    });
  }

  async getLegacyStats() {
    const summary = await this.getSummary();
    const statusCounts = await this.getTicketsByStatus();
    const getStatus = (status: TicketStatus) => statusCounts.find((item) => item.status === status)?.value || 0;

    return {
      tickets: {
        totalTickets: statusCounts.reduce((sum, item) => sum + item.value, 0),
        openTickets: summary.openTickets,
        closedTickets: getStatus('resolved'),
        byPriority: {
          low: await Ticket.count({ where: { priority: 'low', status: { [Op.ne]: 'resolved' } } }),
          medium: await Ticket.count({ where: { priority: 'medium', status: { [Op.ne]: 'resolved' } } }),
          high: await Ticket.count({ where: { priority: 'high', status: { [Op.ne]: 'resolved' } } }),
          critical: await Ticket.count({ where: { priority: 'critical', status: { [Op.ne]: 'resolved' } } }),
        },
      },
      assets: {
        total: summary.totalAssets,
        active: await Asset.count({ where: { status: 'active' } }),
        inMaintenance: summary.assetsInMaintenance,
        disposed: await Asset.count({ where: { status: 'disposed' } }),
        byType: {
          computers: await Asset.count({ where: { type: { [Op.in]: ['computer', 'laptop'] }, status: 'active' } }),
          printers: await Asset.count({ where: { type: 'printer', status: 'active' } }),
          network: await Asset.count({ where: { type: { [Op.in]: ['switch', 'router'] }, status: 'active' } }),
          others: await Asset.count({ where: { type: { [Op.notIn]: ['computer', 'laptop', 'printer', 'switch', 'router'] }, status: 'active' } }),
        },
      },
      maintenance: {
        pending: summary.assetsInMaintenance,
        completed: 0,
        overdue: 0,
      },
    };
  }
}
