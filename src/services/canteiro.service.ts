import { Injectable } from '@nestjs/common';
import { CanteiroRepository } from '../repositories/canteiro.repository';
import { HttpError } from '../core/httpError';

@Injectable()
export class CanteiroService {
  private readonly repo = new CanteiroRepository();

  // O front espera uma lista de canteiros, não os registros de vínculo:
  // por isso o map extraindo v.canteiro.
  async findByUser(userId: string) {
    if (!userId) throw new HttpError('userId é obrigatório', 400);

    const vinculos = await this.repo.findVinculosByUser(userId);
    return vinculos.map((v) => v.canteiro);
  }

  // Com user_id no corpo, já cria o vínculo — senão o canteiro nasce órfão
  // e não aparece em nenhuma listagem do aluno.
  async create(body: any) {
    const { plant_id, name, user_id } = body ?? {};

    if (!plant_id || !name) {
      throw new HttpError('plant_id e name são obrigatórios', 400);
    }

    const canteiro = await this.repo.create({ plant_id, name });

    if (user_id) {
      await this.repo.vincularUsuario(user_id, canteiro.id);
    }

    return canteiro;
  }

  findListasByCanteiro(id: string) {
    if (!id) throw new HttpError('canteiroId é obrigatório', 400);
    return this.repo.findListasByCanteiro(id);
  }
}
