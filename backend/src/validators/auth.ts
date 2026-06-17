import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(150),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'technician', 'user']).optional(),
});

export function validateLogin(req: Request, _res: Response, next: NextFunction): void {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    const errors = formatZodErrors(result.error.errors);
    throw new ValidationError(errors);
  }
  req.body = result.data;
  next();
}

export function validateRegister(req: Request, _res: Response, next: NextFunction): void {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    const errors = formatZodErrors(result.error.errors);
    throw new ValidationError(errors);
  }
  req.body = result.data;
  next();
}

function formatZodErrors(errors: z.ZodIssue[]): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  for (const error of errors) {
    const path = error.path.join('.');
    if (!formatted[path]) formatted[path] = [];
    formatted[path].push(error.message);
  }
  return formatted;
}
