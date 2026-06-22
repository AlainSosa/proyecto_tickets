import { Op } from 'sequelize';
import { Asset, NetworkPoint, Ticket, User } from '../database/models';

type TicketStatus = 'open' | 'pending_assignment' | 'assigned' | 'pending' | 'in_progress' | 'on_hold' | 'resolved' | 'closed' | 'canceled';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

const STATUS_VALUES: TicketStatus[] = ['pending_assignment', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed', 'canceled'];
const OPEN_STATUS_VALUES: TicketStatus[] = ['open', 'pending_assignment', 'assigned', 'pending', 'in_progress', 'on_hold'];
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
  async getSummary() {
    const currentMonth = startOfMonth();
    const nextMonth = addMonths(currentMonth, 1);

    const [
      openTickets,
      inProgressTickets,
      criticalTickets,
      resolvedThisMonth,
      totalAssets,
      assetsInMaintenance,
      totalNetworkPoints,
      inactiveNetworkPoints,
    ] = await Promise.all([
      Ticket.count({ where: { status: { [Op.in]: OPEN_STATUS_VALUES } } }),
      Ticket.count({ where: { status: 'in_progress' } }),
      Ticket.count({
        where: {
          priority: { [Op.in]: ['high', 'critical'] as TicketPriority[] },
          status: { [Op.notIn]: ['resolved', 'closed', 'canceled'] as TicketStatus[] },
        },
      }),
      Ticket.count({
        where: {
          status: 'resolved',
          resolutionDate: { [Op.gte]: currentMonth, [Op.lt]: nextMonth },
        },
      }),
      Asset.count(),
      Asset.count({ where: { status: 'maintenance' } }),
      NetworkPoint.count(),
      NetworkPoint.count({ where: { status: 'inactive' } }),
    ]);

    return {
      openTickets,
      inProgressTickets,
      criticalTickets,
      resolvedThisMonth,
      totalAssets,
      assetsInMaintenance,
      totalNetworkPoints,
      inactiveNetworkPoints,
    };
  }

  async getTicketsByStatus() {
    const counts = await Promise.all(
      STATUS_VALUES.map(async (status) => ({
        status,
        value: await Ticket.count({ where: { status } }),
      }))
    );

    return counts;
  }

  async getTicketsByMonth() {
    const firstMonth = addMonths(startOfMonth(), -5);
    const tickets = await Ticket.findAll({
      attributes: ['id', 'createdAt'],
      where: { createdAt: { [Op.gte]: firstMonth } },
      order: [['createdAt', 'ASC']],
    });

    const buckets = new Map<string, { month: string; label: string; value: number }>();
    for (let index = 0; index < 6; index += 1) {
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

  async getTicketsByCategory() {
    const tickets = await Ticket.findAll({
      attributes: ['id', 'title', 'description'],
    });

    const counts = new Map(CATEGORY_VALUES.map((category) => [category, 0]));
    for (const ticket of tickets) {
      const category = inferCategory(ticket);
      counts.set(category, (counts.get(category) || 0) + 1);
    }

    return CATEGORY_VALUES.map((category) => ({
      category,
      value: counts.get(category) || 0,
    }));
  }

  async getRecentTickets() {
    return Ticket.findAll({
      limit: 8,
      include: [
        { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'technician', attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async getCriticalTickets() {
    return Ticket.findAll({
      limit: 8,
      where: {
        priority: { [Op.in]: ['high', 'critical'] as TicketPriority[] },
        status: { [Op.notIn]: ['resolved', 'closed', 'canceled'] as TicketStatus[] },
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
        openTickets: summary.openTickets + summary.inProgressTickets,
        closedTickets: getStatus('closed'),
        byPriority: {
          low: await Ticket.count({ where: { priority: 'low', status: { [Op.ne]: 'closed' } } }),
          medium: await Ticket.count({ where: { priority: 'medium', status: { [Op.ne]: 'closed' } } }),
          high: await Ticket.count({ where: { priority: 'high', status: { [Op.ne]: 'closed' } } }),
          critical: await Ticket.count({ where: { priority: 'critical', status: { [Op.ne]: 'closed' } } }),
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
