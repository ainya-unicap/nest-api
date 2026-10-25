import { Injectable } from '@nestjs/common';
import { CanteiroRepository } from '../repositories/canteiro.repository';
import { UserCanteiroRepository } from '../repositories/usercanteiro.repository';
import { HttpError } from '../core/httpError';

@Injectable()
export class CanteiroService {
  private readonly repo = new CanteiroRepository();
  private readonly userCanteiroRepo = new UserCanteiroRepository();

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

  /**
   * Todos os formulários do canteiro, organizados por lista. Exclusivo de
   * quem está vinculado ao canteiro — não usa IA, é leitura direta do banco.
   */
  async findFormulariosByCanteiro(canteiroId: string, userId: string) {
    await this.validarAcessoCanteiro(canteiroId, userId);
    return this.repo.findFormulariosByCanteiro(canteiroId);
  }

  /** Lança 404/403 se o canteiro não existir ou o usuário não estiver vinculado. */
  async validarAcessoCanteiro(canteiroId: string, userId: string) {
    if (!canteiroId) throw new HttpError('canteiroId é obrigatório', 400);
    if (!userId) throw new HttpError('userId é obrigatório', 400);

    const canteiro = await this.repo.findById(canteiroId);
    if (!canteiro) throw new HttpError('Canteiro não encontrado', 404);

    const vinculado = await this.userCanteiroRepo.exists(userId, canteiroId);
    if (!vinculado) throw new HttpError('Usuário não está vinculado a este canteiro', 403);
  }
}
