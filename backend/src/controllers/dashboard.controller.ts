import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';

const dashboardService = new DashboardService();

export class DashboardController {
  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await dashboardService.getLegacyStats();
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }

  async getSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getSummary());
    } catch (error) {
      next(error);
    }
  }

  async getTicketsByStatus(_req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getTicketsByStatus());
    } catch (error) {
      next(error);
    }
  }

  async getTicketsByMonth(_req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getTicketsByMonth());
    } catch (error) {
      next(error);
    }
  }

  async getTicketsByCategory(_req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getTicketsByCategory());
    } catch (error) {
      next(error);
    }
  }

  async getRecentTickets(_req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getRecentTickets());
    } catch (error) {
      next(error);
    }
  }

  async getCriticalTickets(_req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getCriticalTickets());
    } catch (error) {
      next(error);
    }
  }

  async getMaintenanceAssets(_req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getMaintenanceAssets());
    } catch (error) {
      next(error);
    }
  }

  async getInactiveNetworkPoints(_req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getInactiveNetworkPoints());
    } catch (error) {
      next(error);
    }
  }
}
