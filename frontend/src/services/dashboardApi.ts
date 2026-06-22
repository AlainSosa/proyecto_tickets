import {
  ApiResponse,
  Asset,
  DashboardCategoryDatum,
  DashboardMonthDatum,
  DashboardStatusDatum,
  DashboardSummary,
  NetworkPoint,
  Ticket,
} from '../types';
import api from './api';

async function getData<T>(endpoint: string): Promise<T> {
  const response = await api.get<ApiResponse<T>>(endpoint);
  return response.data.data;
}

export const dashboardApi = {
  summary: () => getData<DashboardSummary>('/dashboard/summary'),
  ticketsByStatus: () => getData<DashboardStatusDatum[]>('/dashboard/tickets-by-status'),
  ticketsByMonth: () => getData<DashboardMonthDatum[]>('/dashboard/tickets-by-month'),
  ticketsByCategory: () => getData<DashboardCategoryDatum[]>('/dashboard/tickets-by-category'),
  recentTickets: () => getData<Ticket[]>('/dashboard/recent-tickets'),
  criticalTickets: () => getData<Ticket[]>('/dashboard/critical-tickets'),
  maintenanceAssets: () => getData<Asset[]>('/dashboard/maintenance-assets'),
  inactiveNetworkPoints: () => getData<NetworkPoint[]>('/dashboard/inactive-network-points'),
};
