import { Injectable } from '@nestjs/common';
import { PlantTemplateRepository } from '../repositories/planttemplate.repository';
import { HttpError } from '../core/httpError';

@Injectable()
export class PlantTemplateService {
  private repo = new PlantTemplateRepository();

  findAll(plantId?: string) {
    return this.repo.findAll(plantId);
  }

  async findById(id: string) {
    const template = await this.repo.findById(id);
    if (!template) throw new HttpError('Template não encontrado', 404);
    return template;
  }

  create(body: any) {
    return this.repo.create(body);
  }

  update(id: string, body: any) {
    return this.repo.update(id, body);
  }

  delete(id: string) {
    return this.repo.delete(id);
  }
}
