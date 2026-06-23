import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';
import { sendPaginated } from '../utils/response';

const auditService = new AuditService();

export class AuditController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      const { auditLogs, total } = await auditService.findAll({
        page,
        limit,
        action: req.query.action as string,
        entity: req.query.entity as string,
        search: req.query.search as string,
        userId,
        dateFrom: dateFrom && !Number.isNaN(dateFrom.getTime()) ? dateFrom : undefined,
        dateTo: dateTo && !Number.isNaN(dateTo.getTime()) ? dateTo : undefined,
      });

      sendPaginated(res, auditLogs, total, page, limit);
    } catch (error) {
      next(error);
    }
  }
}
