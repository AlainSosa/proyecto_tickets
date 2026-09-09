import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { INSTITUTIONAL_AREAS } from '../constants/institutionalAreas';
import { ValidationError } from '../utils/errors';

const createAccessRequestSchema = z.object({
  name: z.string().min(3).max(150),
  email: z.string().email(),
  area: z.enum(INSTITUTIONAL_AREAS),
  phone: z.string().max(40).optional(),
  message: z.string().max(1000).optional(),
});

const approveAccessRequestSchema = z.object({
  password: z.string().min(6),
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

export function validateCreateAccessRequest(req: Request, _res: Response, next: NextFunction) {
  validate(createAccessRequestSchema, req, next);
}

export function validateApproveAccessRequest(req: Request, _res: Response, next: NextFunction) {
  validate(approveAccessRequestSchema, req, next);
}