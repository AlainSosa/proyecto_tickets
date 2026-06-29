import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';
import { INSTITUTIONAL_AREAS } from '../constants/institutionalAreas';

const institutionalAreaSchema = z.enum(INSTITUTIONAL_AREAS);

const createTicketSchema = z.object({
  title: z.string().min(5, 'El título debe tener al menos 5 caracteres').max(200),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  category: z.string().min(2, 'La categoría es obligatoria').max(100),
  location: institutionalAreaSchema,
  attachments: z.array(z.string().url()).max(5).optional(),
});

const ticketStatusSchema = z.enum(['pending', 'in_progress', 'resolved']);
const ticketPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

const updateTicketSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(10).optional(),
  category: z.string().min(2).max(100).optional(),
  location: institutionalAreaSchema.optional(),
  attachments: z.array(z.string().url()).max(5).optional(),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.nullable().optional(),
  assignedTo: z.number().int().positive().nullable().optional(),
  comment: z.string().optional(),
  diagnosis: z.string().optional(),
  solution: z.string().optional(),
});

const addCommentSchema = z.object({
  comment: z.string().min(1, 'El comentario no puede estar vacío'),
});

const assignTicketSchema = z.object({
  assignedTo: z.number().int().positive(),
  priority: ticketPrioritySchema.nullable().optional(),
});

const prioritySchema = z.object({
  priority: ticketPrioritySchema,
});

const statusSchema = z.object({
  status: ticketStatusSchema,
  comment: z.string().optional(),
});

const followUpSchema = z.object({
  comment: z.string().optional(),
  diagnosis: z.string().optional(),
  solution: z.string().optional(),
}).refine((data) => data.comment || data.diagnosis || data.solution, {
  message: 'Debes registrar al menos un comentario, diagnóstico o solución',
});

const solutionSchema = z.object({
  solution: z.string().min(1, 'La solución no puede estar vacía'),
});

const closeTicketSchema = z.object({
  comment: z.string().optional(),
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

export function validateAssignTicket(req: Request, _res: Response, next: NextFunction): void {
  validateWithSchema(assignTicketSchema, req, next);
}

export function validatePriority(req: Request, _res: Response, next: NextFunction): void {
  validateWithSchema(prioritySchema, req, next);
}

export function validateStatus(req: Request, _res: Response, next: NextFunction): void {
  validateWithSchema(statusSchema, req, next);
}

export function validateFollowUp(req: Request, _res: Response, next: NextFunction): void {
  validateWithSchema(followUpSchema, req, next);
}

export function validateSolution(req: Request, _res: Response, next: NextFunction): void {
  validateWithSchema(solutionSchema, req, next);
}

export function validateCloseTicket(req: Request, _res: Response, next: NextFunction): void {
  validateWithSchema(closeTicketSchema, req, next);
}

function validateWithSchema(schema: z.ZodTypeAny, req: Request, next: NextFunction): void {
  const result = schema.safeParse(req.body);
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
