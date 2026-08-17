import { Injectable } from '@nestjs/common';
import { ChecklistRepository } from '../repositories/checklist.repository';
import { HttpError } from '../core/httpError';

@Injectable()
export class ChecklistService {
  private repo = new ChecklistRepository();

  createManyForFormulario(form_id: string, template_ids: string[]) {
    return this.repo.createManyForFormulario(form_id, template_ids);
  }

  updateChecked(id: string, checked: boolean) {
    return this.repo.updateChecked(id, checked);
  }

  findByFormulario(form_id: string) {
    return this.repo.findByFormulario(form_id);
  }

  create(body: any) {
    return this.repo.create(body);
  }
}
