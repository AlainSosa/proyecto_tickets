import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';
import { INSTITUTIONAL_AREAS } from '../constants/institutionalAreas';

const extensionSchema = z.object({
  extensionNumber: z.string().min(1).max(50),
  ipAddress: z.string().nullable().optional(),
  phoneId: z.number().int().positive().nullable().optional(),
  assignedTo: z.number().int().positive().nullable().optional(),
  location: z.enum(INSTITUTIONAL_AREAS).nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const updateExtensionSchema = extensionSchema.partial();

export function validateCreateExtension(req: Request, _res: Response, next: NextFunction): void {
  validateWithSchema(extensionSchema, req, next);
}

export function validateUpdateExtension(req: Request, _res: Response, next: NextFunction): void {
  validateWithSchema(updateExtensionSchema, req, next);
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
