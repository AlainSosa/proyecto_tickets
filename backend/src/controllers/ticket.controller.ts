import { Request, Response, NextFunction } from 'express';
import { TicketService } from '../services/ticket.service';
import { sendSuccess, sendPaginated } from '../utils/response';

const ticketService = new TicketService();

export class TicketController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketService.create({
        ...req.body,
        requestedBy: req.user!.id,
      });
      sendSuccess(res, ticket, 'Ticket created', 201);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const priority = req.query.priority as string;
      const search = req.query.search as string;

      const requestedBy = req.query.requestedBy ? parseInt(req.query.requestedBy as string) : undefined;
      const assignedTo = req.query.assignedTo ? parseInt(req.query.assignedTo as string) : undefined;

      const { tickets, total } = await ticketService.findAll({ page, limit, status, priority, search, requestedBy, assignedTo });
      sendPaginated(res, tickets, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketService.findById(parseInt(req.params.id));
      sendSuccess(res, ticket);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketService.update(parseInt(req.params.id), req.body, req.user!.id);
      sendSuccess(res, ticket, 'Ticket updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await ticketService.delete(parseInt(req.params.id));
      sendSuccess(res, null, 'Ticket deleted');
    } catch (error) {
      next(error);
    }
  }

  async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const comment = await ticketService.addComment(
        parseInt(req.params.id),
        req.user!.id,
        req.body.comment
      );
      sendSuccess(res, comment, 'Comment added', 201);
    } catch (error) {
      next(error);
    }
  }
}
