import { Injectable } from '@nestjs/common';
import { AlunoRepository } from '../repositories/aluno.repository';

@Injectable()
export class AlunoService {
  private repo = new AlunoRepository();

  getResumo(userId: string) {
    return this.repo.getResumo(userId);
  }

  getHome(userId: string) {
    return this.repo.getHomeRecent(userId);
  }
}
