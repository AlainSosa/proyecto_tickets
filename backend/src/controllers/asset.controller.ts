import { Request, Response, NextFunction } from 'express';
import { AssetService } from '../services/asset.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { isInstitutionalArea } from '../constants/institutionalAreas';

const assetService = new AssetService();

export class AssetController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const asset = await assetService.create(req.body);
      sendSuccess(res, asset, 'Activo creado correctamente', 201);
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
      const requestedLocation = req.query.location as string;
      const location = isInstitutionalArea(requestedLocation) ? requestedLocation : undefined;
      const search = req.query.search as string;

      const { assets, total } = await assetService.findAll({ page, limit, type, status, location, search });
      sendPaginated(res, assets, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const asset = await assetService.findById(parseInt(req.params.id));
      sendSuccess(res, asset);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const asset = await assetService.update(parseInt(req.params.id), req.body);
      sendSuccess(res, asset, 'Activo actualizado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await assetService.delete(parseInt(req.params.id));
      sendSuccess(res, null, 'Activo eliminado correctamente');
    } catch (error) {
      next(error);
    }
  }
}
