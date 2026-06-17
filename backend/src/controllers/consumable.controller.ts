import { Request, Response, NextFunction } from 'express';
import { ConsumableService } from '../services/consumable.service';
import { sendSuccess, sendPaginated } from '../utils/response';

const service = new ConsumableService();

export class ConsumableController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await service.create(req.body);
      sendSuccess(res, item, 'Consumable created', 201);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const type = req.query.type as string;
      const status = req.query.status as string;
      const search = req.query.search as string;

      const { consumables, total } = await service.findAll({ page, limit, type, status, search });
      sendPaginated(res, consumables, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await service.findById(parseInt(req.params.id));
      sendSuccess(res, item);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await service.update(parseInt(req.params.id), req.body);
      sendSuccess(res, item, 'Consumable updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await service.delete(parseInt(req.params.id));
      sendSuccess(res, null, 'Consumable deleted');
    } catch (error) {
      next(error);
    }
  }
}
