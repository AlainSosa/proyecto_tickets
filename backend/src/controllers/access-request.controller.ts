import { Request, Response, NextFunction } from 'express';
import { AccessRequestService } from '../services/access-request.service';
import { sendSuccess, sendPaginated } from '../utils/response';

const accessRequestService = new AccessRequestService();

export class AccessRequestController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const request = await accessRequestService.create(req.body);
      sendSuccess(res, request, 'Solicitud de acceso registrada correctamente', 201);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const validStatus = isAccessRequestStatus(status) ? status : undefined;

      const { requests, total } = await accessRequestService.findAll({ page, limit, status: validStatus });
      sendPaginated(res, requests, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await accessRequestService.approve(parseInt(req.params.id), req.body.password);
      sendSuccess(res, result, 'Solicitud aprobada y usuario creado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      await accessRequestService.reject(parseInt(req.params.id));
      sendSuccess(res, null, 'Solicitud rechazada correctamente');
    } catch (error) {
      next(error);
    }
  }
}

function isAccessRequestStatus(value: string): value is 'pending' | 'approved' | 'rejected' {
  return value === 'pending' || value === 'approved' || value === 'rejected';
}