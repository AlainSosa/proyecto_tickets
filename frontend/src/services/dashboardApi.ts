import {
  ApiResponse,
  Asset,
  DashboardCategoryDatum,
  DashboardAreaDatum,
  DashboardMonthDatum,
  DashboardStatusDatum,
  DashboardSummary,
  DashboardTechnicianMetric,
  NetworkPoint,
  TicketPriority,
  Ticket,
} from '../types';
import api from './api';

async function getData<T>(endpoint: string): Promise<T> {
  const response = await api.get<ApiResponse<T>>(endpoint);
  return response.data.data;
}

async function getDataWithParams<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const response = await api.get<ApiResponse<T>>(endpoint, { params });
  return response.data.data;
}

export const dashboardApi = {
  summary: (params?: Record<string, string>) => getDataWithParams<DashboardSummary>('/dashboard/summary', params),
  ticketsByStatus: (params?: Record<string, string>) => getDataWithParams<DashboardStatusDatum[]>('/dashboard/tickets-by-status', params),
  ticketsByMonth: (params?: Record<string, string>) => getDataWithParams<DashboardMonthDatum[]>('/dashboard/tickets-by-month', params),
  ticketsByCategory: (params?: Record<string, string>) => getDataWithParams<DashboardCategoryDatum[]>('/dashboard/tickets-by-category', params),
  ticketsByArea: (params?: Record<string, string>) => getDataWithParams<DashboardAreaDatum[]>('/dashboard/tickets-by-area', params),
  ticketsByPriority: (params?: Record<string, string>) => getDataWithParams<Record<TicketPriority, number>>('/dashboard/tickets-by-priority', params),
  technicianMetrics: (params?: Record<string, string>) => getDataWithParams<DashboardTechnicianMetric[]>('/dashboard/technician-metrics', params),
  resolutionTrend: (params?: Record<string, string>) => getDataWithParams<DashboardMonthDatum[]>('/dashboard/resolution-trend', params),
  recentTickets: (params?: Record<string, string>) => getDataWithParams<Ticket[]>('/dashboard/recent-tickets', params),
  criticalTickets: (params?: Record<string, string>) => getDataWithParams<Ticket[]>('/dashboard/critical-tickets', params),
  maintenanceAssets: () => getData<Asset[]>('/dashboard/maintenance-assets'),
  inactiveNetworkPoints: () => getData<NetworkPoint[]>('/dashboard/inactive-network-points'),
};
