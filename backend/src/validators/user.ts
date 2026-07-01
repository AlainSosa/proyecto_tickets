import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { INSTITUTIONAL_AREAS } from '../constants/institutionalAreas';
import { ValidationError } from '../utils/errors';

const baseUserSchema = z.object({
  name: z.string().min(3).max(150),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'technician', 'user']),
  area: z.enum(INSTITUTIONAL_AREAS),
  isActive: z.boolean().optional(),
});

const updateUserSchema = baseUserSchema.partial().extend({
  password: z.string().min(6).optional(),
});

function validate(schema: z.ZodTypeAny, req: Request, next: NextFunction) {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors: Record<string, string[]> = {};
    result.error.errors.forEach((error) => {
      const field = error.path.join('.');
      errors[field] = [...(errors[field] || []), error.message];
    });
    throw new ValidationError(errors);
  }
  req.body = result.data;
  next();
}

export function validateCreateUser(req: Request, _res: Response, next: NextFunction) {
  validate(baseUserSchema, req, next);
}

export function validateUpdateUser(req: Request, _res: Response, next: NextFunction) {
  validate(updateUserSchema, req, next);
}
