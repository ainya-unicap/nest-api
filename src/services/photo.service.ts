import { Injectable } from '@nestjs/common';
import { PhotoRepository } from '../repositories/photo.repository';
import { HttpError } from '../core/httpError';

@Injectable()
export class PhotoService {
  private repo = new PhotoRepository();

  create(body: { form_id: string; url: string }) {
    return this.repo.create(body);
  }

  findByFormulario(form_id: string) {
    return this.repo.findByFormulario(form_id);
  }

  async delete(id: string) {
    return this.repo.delete(id);
  }
}
