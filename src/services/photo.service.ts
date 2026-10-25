import { Injectable } from '@nestjs/common';
import { PhotoRepository } from '../repositories/photo.repository';
import { HttpError } from '../core/httpError';

// Registro fotográfico do formulário: no máximo 5 fotos.
const LIMITE_FOTOS_POR_FORMULARIO = 5;

@Injectable()
export class PhotoService {
  private repo = new PhotoRepository();

  async create(body: { form_id: string; url: string }) {
    if (!body?.form_id) throw new HttpError('form_id é obrigatório', 400);
    if (!body?.url) throw new HttpError('url é obrigatória', 400);

    const total = await this.repo.countByFormulario(body.form_id);
    if (total >= LIMITE_FOTOS_POR_FORMULARIO) {
      throw new HttpError(
        `Limite de ${LIMITE_FOTOS_POR_FORMULARIO} fotos por formulário atingido`,
        400,
        { codigo: 'LIMITE_FOTOS_ATINGIDO' },
      );
    }

    return this.repo.create(body);
  }

  findByFormulario(form_id: string) {
    return this.repo.findByFormulario(form_id);
  }

  async delete(id: string) {
    return this.repo.delete(id);
  }
}
