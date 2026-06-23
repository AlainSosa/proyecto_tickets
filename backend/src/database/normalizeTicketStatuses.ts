import { Op } from 'sequelize';
import { Ticket } from './models';

export async function normalizeTicketStatuses(): Promise<void> {
  await Promise.all([
    Ticket.update(
      { status: 'pending' },
      { where: { status: { [Op.in]: ['open', 'pending_assignment', 'assigned', 'on_hold'] } } } as any
    ),
    Ticket.update(
      { status: 'resolved' },
      { where: { status: { [Op.in]: ['closed', 'canceled'] } } } as any
    ),
  ]);
}
