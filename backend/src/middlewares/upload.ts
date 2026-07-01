import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

export const ticketUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

export function normalizeTicketAttachments(req: Request, _res: Response, next: NextFunction): void {
  const existing = req.body.attachments;
  let attachments: string[] = [];

  if (existing) {
    if (Array.isArray(existing)) {
      attachments = existing.filter((item) => Boolean(item));
    } else if (typeof existing === 'string') {
      try {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed)) attachments = parsed.filter((item) => Boolean(item));
        else attachments = [existing];
      } catch {
        attachments = [existing];
      }
    }
  }

  const files = (req.files as Express.Multer.File[] | undefined) || [];
  const fileUrls = files.map((file) => `/api/uploads/${file.filename}`);

  req.body.attachments = [...attachments, ...fileUrls];
  next();
}
