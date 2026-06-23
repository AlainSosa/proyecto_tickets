import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';
import { INSTITUTIONAL_AREAS } from '../constants/institutionalAreas';

const institutionalAreaSchema = z.enum(INSTITUTIONAL_AREAS);

const createAssetSchema = z.object({
  internalCode: z.string().min(1).max(50),
  type: z.enum(['computer', 'laptop', 'printer', 'ups', 'switch', 'router', 'ip_phone', 'monitor', 'other']),
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  serialNumber: z.string().min(1).max(100),
  status: z.enum(['active', 'inactive', 'maintenance', 'disposed']).optional(),
  location: institutionalAreaSchema.nullable().optional(),
  assignedTo: z.number().int().positive().nullable().optional(),
  acquisitionDate: z.string().nullable().optional(),
  observations: z.string().nullable().optional(),
});

const updateAssetSchema = createAssetSchema.partial();

export function validateCreateAsset(req: Request, _res: Response, next: NextFunction): void {
  const result = createAssetSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(formatErrors(result.error.errors));
  }
  req.body = result.data;
  next();
}

export function validateUpdateAsset(req: Request, _res: Response, next: NextFunction): void {
  const result = updateAssetSchema.safeParse(req.body);
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
