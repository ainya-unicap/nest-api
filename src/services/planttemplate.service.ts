import { Injectable } from '@nestjs/common';
import { PlantTemplateRepository } from '../repositories/planttemplate.repository';

@Injectable()
export class PlantTemplateService {
  private repo = new PlantTemplateRepository();

  findAll() {
    return this.repo.findAll();
  }

  findById(id: string) {
    return this.repo.findById(id);
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
