import { Request, Response, NextFunction } from 'express';
import { TicketService } from '../services/ticket.service';
import { AssetService } from '../services/asset.service';
import { MaintenanceService } from '../services/maintenance.service';
import { sendSuccess } from '../utils/response';

const ticketService = new TicketService();
const assetService = new AssetService();
const maintenanceService = new MaintenanceService();

export class DashboardController {
  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const [ticketStats, assetStats, maintenanceStats] = await Promise.all([
        ticketService.getDashboardStats(),
        assetService.getDashboardStats(),
        maintenanceService.getDashboardStats(),
      ]);

      sendSuccess(res, {
        tickets: ticketStats,
        assets: assetStats,
        maintenance: maintenanceStats,
      });
    } catch (error) {
      next(error);
    }
  }
}
