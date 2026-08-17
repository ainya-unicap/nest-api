import { Injectable } from '@nestjs/common';
import { MeasurementRepository } from '../repositories/measurement.repository';

@Injectable()
export class MeasurementService {
  private repo = new MeasurementRepository();

  createManyForFormulario(form_id: string, measurements: any[]) {
    return this.repo.createManyForFormulario(form_id, measurements);
  }

  updateValue(id: string, value: number) {
    return this.repo.updateValue(id, value);
  }

  findByFormulario(form_id: string) {
    return this.repo.findByFormulario(form_id);
  }

  create(body: any) {
    return this.repo.create(body);
  }
}
