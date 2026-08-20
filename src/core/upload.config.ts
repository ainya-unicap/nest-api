import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';

// Storage condicional:
//  - Em produção (Vercel) usamos memoryStorage: o arquivo fica em file.buffer
//    e é enviado pro Vercel Blob.
//  - Em dev local usamos diskStorage: arquivo vai pra public/uploads/ e a URL
//    é o caminho relativo.
const isVercel = !!process.env.VERCEL;

export const UPLOAD_DIR = path.resolve('public/uploads');

if (!isVercel && !fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(
      file.originalname,
    )}`;

    cb(null, uniqueName);
  },
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const uploadOptions: MulterOptions = {
  storage: isVercel ? multer.memoryStorage() : diskStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new BadRequestException('Tipo de arquivo inválido. Use JPEG, PNG ou WEBP.'),
        false,
      );
    }

    cb(null, true);
  },
};
