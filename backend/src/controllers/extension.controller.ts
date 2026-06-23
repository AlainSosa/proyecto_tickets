import { Request, Response, NextFunction } from 'express';
import { ExtensionService } from '../services/extension.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { isInstitutionalArea } from '../constants/institutionalAreas';

const service = new ExtensionService();

export class ExtensionController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const ext = await service.create(req.body);
      sendSuccess(res, ext, 'Extension created', 201);
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

      const { extensions, total } = await service.findAll({ page, limit, status, location, search });
      sendPaginated(res, extensions, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const ext = await service.findById(parseInt(req.params.id));
      sendSuccess(res, ext);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const ext = await service.update(parseInt(req.params.id), req.body);
      sendSuccess(res, ext, 'Extension updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await service.delete(parseInt(req.params.id));
      sendSuccess(res, null, 'Extension deleted');
    } catch (error) {
      next(error);
    }
  }
}
