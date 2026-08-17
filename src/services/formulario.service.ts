import { Injectable } from '@nestjs/common';
import { FormularioRepository } from '../repositories/formulario.repository';
import { HttpError } from '../core/httpError';

@Injectable()
export class FormularioService {
  private repo = new FormularioRepository();

  findAllByUser(user_id: string) {
    return this.repo.findManyByUser(user_id);
  }

  create(body: any) {
    return this.repo.create(body);
  }

  findById(id: string) {
    if (!id) throw new HttpError('id é obrigatório', 400);
    return this.repo.findById(id);
  }

  getChecklist(id: string) {
    return this.repo.getChecklist(id);
  }

  getMeasurements(id: string) {
    return this.repo.getMeasurements(id);
  }

  getPhotos(id: string) {
    return this.repo.getPhotos(id);
  }

  update(id: string, body: any) {
    return this.repo.update(id, body);
  }

  delete(id: string, userId?: string) {
    // keep legacy checks in higher layer if needed
    return this.repo.delete(id);
  }

  finalizar(id: string) {
    return this.repo.finalizar(id);
  }

  sync(id: string, body: any) {
    return this.repo.sync(id, body);
  }
}
