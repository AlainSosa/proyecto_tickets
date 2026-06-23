import { Request, Response, NextFunction } from 'express';
import { NetworkPointService } from '../services/network-point.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { isInstitutionalArea } from '../constants/institutionalAreas';

const service = new NetworkPointService();

export class NetworkPointController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const point = await service.create(req.body);
      sendSuccess(res, point, 'Network point created', 201);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const requestedLocation = req.query.location as string;
      const location = isInstitutionalArea(requestedLocation) ? requestedLocation : undefined;
      const search = req.query.search as string;

      const { points, total } = await service.findAll({ page, limit, status, location, search });
      sendPaginated(res, points, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const point = await service.findById(parseInt(req.params.id));
      sendSuccess(res, point);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const point = await service.update(parseInt(req.params.id), req.body);
      sendSuccess(res, point, 'Network point updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await service.delete(parseInt(req.params.id));
      sendSuccess(res, null, 'Network point deleted');
    } catch (error) {
      next(error);
    }
  }
}
