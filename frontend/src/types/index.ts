import { InstitutionalArea } from '../constants/institutionalAreas';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'technician' | 'user';
  area: InstitutionalArea;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  category: string;
  location: InstitutionalArea;
  attachments: string[] | null;
  status: TicketStatus;
  priority: TicketPriority | null;
  requestedBy: number;
  assignedTo: number | null;
  resolutionDate: string | null;
  createdAt: string;
  updatedAt: string;
  requester?: User;
  technician?: User | null;
  comments?: TicketComment[];
  histories?: TicketHistory[];
}

export interface TicketComment {
  id: number;
  ticketId: number;
  userId: number;
  comment: string;
  createdAt: string;
  author?: User;
}

export interface TicketHistory {
  id: number;
  ticketId: number;
  userId: number;
  action?: TicketHistoryAction | null;
  actorRole?: User['role'] | null;
  field: string;
  oldValue: string | null;
  newValue: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  assignedTechnicianId?: number | null;
  priority?: string | null;
  comment?: string | null;
  solution?: string | null;
  createdAt: string;
  author?: User;
}

export interface AuditLog {
  id: number;
  userId: number;
  action: string;
  entity: string;
  entityId: number | null;
  ipAddress: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: string;
  user?: User;
}

export type TicketStatus = 'pending' | 'in_progress' | 'resolved';

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export type TicketHistoryAction =
  | 'ticket_created'
  | 'ticket_assigned'
  | 'priority_defined'
  | 'status_updated'
  | 'comment_added'
  | 'diagnosis_registered'
  | 'solution_registered'
  | 'ticket_resolved'
  | 'ticket_closed'
  | 'ticket_reassigned'
  | 'follow_up_added';

export interface Asset {
  id: number;
  internalCode: string;
  type: AssetType;
  brand: string;
  model: string;
  serialNumber: string;
  status: AssetStatus;
  location: InstitutionalArea | null;
  assignedTo: number | null;
  acquisitionDate: string | null;
  observations: string | null;
  createdAt: string;
  updatedAt: string;
  assignedUser?: User | null;
}

export type AssetType = 'computer' | 'laptop' | 'printer' | 'ups' | 'switch' | 'router' | 'ip_phone' | 'monitor' | 'other';
export type AssetStatus = 'active' | 'inactive' | 'maintenance' | 'disposed';

export interface NetworkPoint {
  id: number;
  label: string;
  location: InstitutionalArea;
  patchPanel: string | null;
  switchId: number | null;
  switchPort: string | null;
  status: 'active' | 'inactive' | 'faulty';
  observations: string | null;
  createdAt: string;
  updatedAt: string;
  switch?: Asset | null;
}

export interface Extension {
  id: number;
  extensionNumber: string;
  ipAddress: string | null;
  phoneId: number | null;
  assignedTo: number | null;
  location: InstitutionalArea | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  assignedUser?: User | null;
  phone?: Asset | null;
}

export interface Maintenance {
  id: number;
  assetId: number;
  type: 'preventive' | 'corrective';
  scheduledDate: string | null;
  performedDate: string | null;
  technicianId: number;
  observations: string | null;
  nextMaintenanceDate: string | null;
  createdAt: string;
  updatedAt: string;
  asset?: Asset;
  technician?: User;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface DashboardStats {
  tickets: {
    totalTickets: number;
    openTickets: number;
    closedTickets: number;
    byPriority: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
  };
  assets: {
    total: number;
    active: number;
    inMaintenance: number;
    disposed: number;
    byType: {
      computers: number;
      printers: number;
      network: number;
      others: number;
    };
  };
  maintenance: {
    pending: number;
    completed: number;
    overdue: number;
  };
}

export interface DashboardSummary {
  totalTickets: number;
  openTickets: number;
  pendingTickets: number;
  assignedTickets: number;
  inProgressTickets: number;
  onHoldTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  criticalTickets: number;
  resolvedThisMonth: number;
  byPriority: Record<TicketPriority, number>;
  totalAssets: number;
  assetsInMaintenance: number;
  totalNetworkPoints: number;
  inactiveNetworkPoints: number;
}

export interface DashboardStatusDatum {
  status: Ticket['status'];
  value: number;
}

export interface DashboardMonthDatum {
  month: string;
  label: string;
  value: number;
}

export interface DashboardCategoryDatum {
  category: string;
  value: number;
}

export interface DashboardAreaDatum {
  area: InstitutionalArea;
  value: number;
}

export interface DashboardTechnicianMetric {
  technicianId: number;
  technicianName: string;
  assignedTickets: number;
  resolvedTickets: number;
  averageResolutionHours: number;
}
