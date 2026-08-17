import { Injectable } from '@nestjs/common';
import { AcademicPeriodRepository } from '../repositories/academicperiod.repository';

@Injectable()
export class AcademicPeriodService {
  private repo = new AcademicPeriodRepository();

  create(body: any) {
    return this.repo.create(body);
  }

  findAll() {
    return this.repo.findAll();
  }

  findById(id: string) {
    return this.repo.findById(id);
  }

  update(id: string, body: any) {
    return this.repo.update(id, body);
  }

  delete(id: string) {
    return this.repo.delete(id);
  }
}
