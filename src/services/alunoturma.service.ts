import { Injectable } from '@nestjs/common';
import { AlunoTurmaRepository } from '../repositories/alunoturma.repository';

@Injectable()
export class AlunoTurmaService {
  private repo = new AlunoTurmaRepository();

  create(body: any) {
    return this.repo.create(body);
  }

  findByTurma(turmaId: string) {
    return this.repo.findByTurma(turmaId);
  }

  delete(body: any) {
    return this.repo.delete(body);
  }
}
