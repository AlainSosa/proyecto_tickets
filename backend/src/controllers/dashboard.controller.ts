import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';

const dashboardService = new DashboardService();

function getDateRange(req: Request) {
  const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
  const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
  if (!dateFrom || !dateTo || Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime())) return undefined;
  return { dateFrom, dateTo };
}

export class DashboardController {
  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await dashboardService.getLegacyStats();
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }

  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getSummary(getDateRange(req)));
    } catch (error) {
      next(error);
    }
  }

  async getTicketsByStatus(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getTicketsByStatus(getDateRange(req)));
    } catch (error) {
      next(error);
    }
  }

  async getTicketsByMonth(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getTicketsByMonth(getDateRange(req)));
    } catch (error) {
      next(error);
    }
  }

  async getTicketsByCategory(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getTicketsByCategory(getDateRange(req)));
    } catch (error) {
      next(error);
    }
  }

  async getTicketsByArea(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getTicketsByArea(getDateRange(req)));
    } catch (error) {
      next(error);
    }
  }

  async getTicketsByPriority(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getTicketsByPriority(getDateRange(req)));
    } catch (error) {
      next(error);
    }
  }

  async getTechnicianMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getTechnicianMetrics(getDateRange(req)));
    } catch (error) {
      next(error);
    }
  }

  async getResolutionTrend(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getResolutionTrend(getDateRange(req)));
    } catch (error) {
      next(error);
    }
  }

  async getRecentTickets(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getRecentTickets(getDateRange(req)));
    } catch (error) {
      next(error);
    }
  }

  async getCriticalTickets(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getCriticalTickets(getDateRange(req)));
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
