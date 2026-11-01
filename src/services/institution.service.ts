import { Injectable } from '@nestjs/common';
import { InstitutionRepository } from '../repositories/institution.repository';
import { erroDeCampos } from '../core/httpError';

@Injectable()
export class InstitutionService {
  private repo = new InstitutionRepository();

  // abbreviation é NOT NULL e única no banco: validar aqui dá uma mensagem
  // por campo em vez de deixar o Prisma recusar com erro genérico.
  create(body: any) {
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const abbreviation =
      typeof body?.abbreviation === 'string' ? body.abbreviation.trim() : '';

    const campos: Record<string, string> = {};
    if (!name || name.length < 2) campos.name = 'obrigatório, mínimo 2 caracteres';
    if (!abbreviation) campos.abbreviation = 'obrigatório (sigla, ex.: UFRPE)';

    if (Object.keys(campos).length > 0) {
      throw erroDeCampos(campos, 'INSTITUICAO_INVALIDA');
    }

    return this.repo.create({ name, abbreviation });
  }

  findAll() {
    return this.repo.findAll();
  }

  findById(id: string) {
    return this.repo.findById(id);
  }
}
