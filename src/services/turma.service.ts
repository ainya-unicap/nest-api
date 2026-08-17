import { Injectable } from '@nestjs/common';
import { TurmaRepository } from '../repositories/turma.repository';

@Injectable()
export class TurmaService {
  private repo = new TurmaRepository();

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
