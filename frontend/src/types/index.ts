export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'technician' | 'user';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
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
  field: string;
  oldValue: string | null;
  newValue: string;
  createdAt: string;
  author?: User;
}

export interface Asset {
  id: number;
  internalCode: string;
  type: AssetType;
  brand: string;
  model: string;
  serialNumber: string;
  status: AssetStatus;
  location: string | null;
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
  location: string;
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
  location: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  assignedUser?: User | null;
  phone?: Asset | null;
}

export interface Consumable {
  id: number;
  name: string;
  type: ConsumableType;
  stock: number;
  minStock: number;
  status: 'available' | 'low' | 'out_of_stock';
  entryDate: string | null;
  observations: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ConsumableType = 'toner' | 'keyboard' | 'mouse' | 'cable' | 'adapter' | 'supplies' | 'other';

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
