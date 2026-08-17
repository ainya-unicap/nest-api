import { Injectable } from '@nestjs/common';
import { InstitutionRepository } from '../repositories/institution.repository';

@Injectable()
export class InstitutionService {
  private repo = new InstitutionRepository();

  create(body: any) {
    return this.repo.create(body);
  }

  findAll() {
    return this.repo.findAll();
  }

  findById(id: string) {
    return this.repo.findById(id);
  }
}
