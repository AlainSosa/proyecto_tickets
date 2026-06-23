import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';
import { INSTITUTIONAL_AREAS } from '../constants/institutionalAreas';

const networkPointSchema = z.object({
  label: z.string().min(1).max(100),
  location: z.enum(INSTITUTIONAL_AREAS),
  patchPanel: z.string().nullable().optional(),
  switchId: z.number().int().positive().nullable().optional(),
  switchPort: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive', 'faulty']).optional(),
  observations: z.string().nullable().optional(),
});

const updateNetworkPointSchema = networkPointSchema.partial();

export function validateCreateNetworkPoint(req: Request, _res: Response, next: NextFunction): void {
  validateWithSchema(networkPointSchema, req, next);
}

export function validateUpdateNetworkPoint(req: Request, _res: Response, next: NextFunction): void {
  validateWithSchema(updateNetworkPointSchema, req, next);
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
