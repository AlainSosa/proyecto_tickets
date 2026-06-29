import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';
import { INSTITUTIONAL_AREAS } from '../constants/institutionalAreas';

const loginSchema = z.object({
  email: z.string().email('El formato del correo no es válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const registerSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(150),
  email: z.string().email('El formato del correo no es válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['admin', 'technician', 'user']).optional(),
  area: z.enum(INSTITUTIONAL_AREAS),
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
