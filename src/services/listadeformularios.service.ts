import { Injectable } from '@nestjs/common';
import { ListaDeFormulariosRepository } from '../repositories/listadeformularios.repository';
import { CanteiroRepository } from '../repositories/canteiro.repository';
import { HttpError } from '../core/httpError';

@Injectable()
export class ListaDeFormulariosService {
  private repo = new ListaDeFormulariosRepository();
  private canteiroRepo = new CanteiroRepository();

  // plant_id vem do canteiro, não do corpo: evita depender do app mandar
  // o valor certo (e ele nem sempre tinha como saber). created_by é sempre
  // o usuário do token.
  async create(body: any, userId: string) {
    if (!userId) throw new HttpError('Token inválido', 401);

    const canteiroId = body?.canteiro_id;
    if (!canteiroId) throw new HttpError('canteiro_id é obrigatório', 400);

    const canteiro = await this.canteiroRepo.findById(canteiroId);
    if (!canteiro) throw new HttpError('Canteiro não encontrado', 404);

    const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : undefined;

    return this.repo.create({
      canteiro_id: canteiroId,
      plant_id: canteiro.plant_id,
      created_by: userId,
      name,
    });
  }

  findById(id: string) {
    return this.repo.findById(id);
  }

  findByCanteiro(canteiroId: string) {
    return this.repo.findByCanteiro(canteiroId);
  }

  findFormularios(listaId: string) {
    return this.repo.findFormularios(listaId);
  }
}
