import { Injectable } from '@nestjs/common';
import { RelatorioRepository } from '../repositories/relatorio.repository';
import { HttpError } from '../core/httpError';

@Injectable()
export class RelatorioService {
  private repo = new RelatorioRepository();

  getRelatoriosByUser(userId: string) {
    return this.repo.getRelatoriosByUser(userId);
  }

  createRelatorio(userId: string, listId: string) {
    return this.repo.createRelatorio({ user_id: userId, list_id: listId, status: 'RASCUNHO', submittedAt: new Date() });
  }

  getRelatorioById(id: string) {
    return this.repo.findById(id);
  }

  updateObjective(id: string, userId: string, novoObjetivo: string) {
    return this.repo.update(id, { objective: novoObjetivo });
  }

  updateSection(id: string, userId: string, secao: string, valor: string) {
    return this.repo.update(id, { [secao]: valor });
  }

  update(id: string, userId: string, body: any) {
    return this.repo.update(id, body);
  }

  submit(id: string, userId: string) {
    return this.repo.update(id, { status: 'SUBMETIDO', submittedAt: new Date() });
  }

  delete(id: string, userId: string) {
    return this.repo.delete(id);
  }
}
