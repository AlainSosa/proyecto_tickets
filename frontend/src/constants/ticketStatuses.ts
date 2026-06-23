import { TicketStatus } from '../types';

export const TICKET_STATUSES: TicketStatus[] = ['pending', 'in_progress', 'resolved'];

export const TICKET_STATUS_LABEL_KEYS: Record<TicketStatus, 'pending' | 'inProgress' | 'finalized'> = {
  pending: 'pending',
  in_progress: 'inProgress',
  resolved: 'finalized',
};

export const TICKET_STATUS_BADGES: Record<TicketStatus, string> = {
  pending: 'badge-yellow',
  in_progress: 'badge-blue',
  resolved: 'badge-green',
};

const LEGACY_STATUS_LABEL_KEYS: Record<string, 'pending' | 'inProgress' | 'finalized'> = {
  open: 'pending',
  pending_assignment: 'pending',
  assigned: 'pending',
  pending: 'pending',
  in_progress: 'inProgress',
  on_hold: 'pending',
  resolved: 'finalized',
  closed: 'finalized',
  canceled: 'finalized',
};

export function getTicketStatusLabelKey(status: string) {
  return LEGACY_STATUS_LABEL_KEYS[status] || 'pending';
}

export function getTicketStatusBadge(status: string) {
  const normalized = status === 'in_progress' ? 'in_progress' : status === 'resolved' || status === 'closed' || status === 'canceled' ? 'resolved' : 'pending';
  return TICKET_STATUS_BADGES[normalized];
}
