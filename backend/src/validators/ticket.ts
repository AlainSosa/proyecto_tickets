import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';

const createTicketSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

const updateTicketSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(10).optional(),
  status: z.enum(['pending', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignedTo: z.number().int().positive().nullable().optional(),
});

const addCommentSchema = z.object({
  comment: z.string().min(1, 'Comment cannot be empty'),
});

export function validateCreateTicket(req: Request, _res: Response, next: NextFunction): void {
  const result = createTicketSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(formatErrors(result.error.errors));
  }
  req.body = result.data;
  next();
}

export function validateUpdateTicket(req: Request, _res: Response, next: NextFunction): void {
  const result = updateTicketSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(formatErrors(result.error.errors));
  }
  req.body = result.data;
  next();
}

export function validateComment(req: Request, _res: Response, next: NextFunction): void {
  const result = addCommentSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(formatErrors(result.error.errors));
  }
  req.body = result.data;
  next();
}

function formatErrors(errors: z.ZodIssue[]): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  for (const error of errors) {
    const path = error.path.join('.');
    if (!formatted[path]) formatted[path] = [];
    formatted[path].push(error.message);
  }
  return formatted;
}
