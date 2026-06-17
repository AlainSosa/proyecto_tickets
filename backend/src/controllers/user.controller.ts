import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { sendSuccess, sendPaginated } from '../utils/response';

const userService = new UserService();

export class UserController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.create(req.body);
      sendSuccess(res, user, 'User created', 201);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const role = req.query.role as string;
      const search = req.query.search as string;

      const { users, total } = await userService.findAll({ page, limit, role, search });
      sendPaginated(res, users, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.findById(parseInt(req.params.id));
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.update(parseInt(req.params.id), req.body);
      sendSuccess(res, user, 'User updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await userService.delete(parseInt(req.params.id));
      sendSuccess(res, null, 'User deleted');
    } catch (error) {
      next(error);
    }
  }
}
