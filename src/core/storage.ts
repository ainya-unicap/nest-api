import { BadRequestException } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';

import { UPLOAD_DIR } from './upload.config';

// Transforma o arquivo recebido pelo multer numa URL persistida.
// Em prod (Vercel) sobe pro Blob; em dev o arquivo já está em public/uploads.
export async function persistUploadedFile(
  file: Express.Multer.File,
  prefix: string,
): Promise<string> {
  if (!file) {
    throw new BadRequestException('Arquivo é obrigatório');
  }

  if (!process.env.VERCEL) {
    return `/uploads/${file.filename}`;
  }

  const { put } = await import('@vercel/blob');
  const blob = await put(`${prefix}/${Date.now()}-${file.originalname}`, file.buffer, {
    access: 'public',
    contentType: file.mimetype,
  });

  return blob.url;
}

// Best-effort cleanup do arquivo anterior (Blob ou disco).
// Nunca derruba o request se falhar.
export async function removeStoredFile(url: string | null | undefined): Promise<void> {
  if (!url) return;

  try {
    if (url.startsWith('http')) {
      const { del } = await import('@vercel/blob');
      await del(url);
      return;
    }

    if (url.startsWith('/uploads/')) {
      const filePath = path.resolve(UPLOAD_DIR, url.replace('/uploads/', ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Falha ao remover arquivo anterior:', err);
  }
}
