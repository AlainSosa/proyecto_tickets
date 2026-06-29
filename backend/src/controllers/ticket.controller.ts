import { Request, Response, NextFunction } from 'express';
import { TicketService } from '../services/ticket.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { ForbiddenError } from '../utils/errors';
import { isInstitutionalArea } from '../constants/institutionalAreas';
import { User } from '../database/models';

const ticketService = new TicketService();

export class TicketController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = await User.findByPk(req.user!.id, { attributes: ['id', 'area'] });
      const ticket = await ticketService.create({
        ...req.body,
        location: req.user!.role === 'user' ? requester!.area : req.body.location,
        requestedBy: req.user!.id,
        ipAddress: req.ip,
      });
      sendSuccess(res, ticket, 'Ticket creado correctamente', 201);
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
      const requestedLocation = req.query.location as string;
      const location = isInstitutionalArea(requestedLocation) ? requestedLocation : undefined;
      const search = req.query.search as string;

      const requestedBy = req.query.requestedBy ? parseInt(req.query.requestedBy as string) : undefined;
      const assignedTo = req.query.assignedTo ? parseInt(req.query.assignedTo as string) : undefined;
      const unassigned = req.query.unassigned === 'true';

      const effectiveRequestedBy = req.user!.role === 'user' ? req.user!.id : requestedBy;
      const effectiveAssignedTo = req.user!.role === 'technician' ? req.user!.id : assignedTo;
      const { tickets, total } = await ticketService.findAll({ page, limit, status, priority, location, search, requestedBy: effectiveRequestedBy, assignedTo: effectiveAssignedTo, unassigned });
      sendPaginated(res, tickets, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketService.findById(parseInt(req.params.id));
      if (req.user!.role === 'user' && ticket.requestedBy !== req.user!.id) {
        throw new ForbiddenError('Solo puedes acceder a tus propios tickets');
      }
      if (req.user!.role === 'technician' && ticket.assignedTo !== req.user!.id) {
        throw new ForbiddenError('Los técnicos solo pueden acceder a tickets asignados');
      }
      sendSuccess(res, ticket);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketService.update(parseInt(req.params.id), req.body, {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
      });
      sendSuccess(res, ticket, 'Ticket actualizado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketService.assign(parseInt(req.params.id), req.body.assignedTo, req.body.priority ?? null, {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
      });
      sendSuccess(res, ticket, 'Ticket asignado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async setPriority(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketService.setPriority(parseInt(req.params.id), req.body.priority, {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
      });
      sendSuccess(res, ticket, 'Prioridad actualizada correctamente');
    } catch (error) {
      next(error);
    }
  }

  async changeStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketService.changeStatus(parseInt(req.params.id), req.body.status, {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
      }, req.body.comment);
      sendSuccess(res, ticket, 'Estado actualizado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async addFollowUp(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketService.addFollowUp(parseInt(req.params.id), {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
      }, req.body);
      sendSuccess(res, ticket, 'Seguimiento registrado correctamente', 201);
    } catch (error) {
      next(error);
    }
  }

  async resolve(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketService.resolve(parseInt(req.params.id), {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
      }, req.body.solution);
      sendSuccess(res, ticket, 'Ticket finalizado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async close(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketService.close(parseInt(req.params.id), {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
      }, req.body.comment);
      sendSuccess(res, ticket, 'Ticket cerrado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await ticketService.delete(parseInt(req.params.id));
      sendSuccess(res, null, 'Ticket eliminado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const ticketId = parseInt(req.params.id);
      const ticket = await ticketService.findById(ticketId);
      if (req.user!.role === 'user' && ticket.requestedBy !== req.user!.id) {
        throw new ForbiddenError('Solo puedes comentar tus propios tickets');
      }
      if (req.user!.role === 'technician' && ticket.assignedTo !== req.user!.id) {
        throw new ForbiddenError('Los técnicos solo pueden comentar tickets asignados');
      }

      const comment = await ticketService.addComment(
        ticketId,
        req.user!.id,
        req.body.comment,
        req.ip
      );
      sendSuccess(res, comment, 'Comentario agregado correctamente', 201);
    } catch (error) {
      next(error);
    }
  }
}
