import { Injectable } from '@nestjs/common';
import { CanteiroRepository } from '../repositories/canteiro.repository';
import { UserCanteiroRepository } from '../repositories/usercanteiro.repository';
import { PlantaForrageiraRepository } from '../repositories/plantaforrageira.repository';
import { HttpError, erroDeCampos } from '../core/httpError';

@Injectable()
export class CanteiroService {
  private readonly repo = new CanteiroRepository();
  private readonly userCanteiroRepo = new UserCanteiroRepository();
  private readonly plantaRepo = new PlantaForrageiraRepository();

  // O front espera uma lista de canteiros, não os registros de vínculo:
  // por isso o map extraindo v.canteiro.
  async findByUser(userId: string) {
    if (!userId) throw new HttpError('userId é obrigatório', 400);

    const vinculos = await this.repo.findVinculosByUser(userId);
    return vinculos.map((v) => v.canteiro);
  }

  // Cria o canteiro, o vínculo com o usuário logado e a lista de formulários
  // numa única transação — nada fica gravado se um passo falhar no meio
  // (antes isso exigia 3 chamadas separadas do app, podendo sobrar canteiro
  // sem lista). user_id/created_by do corpo são sempre ignorados: o dono é
  // quem está no token.
  async create(body: any, userId: string) {
    if (!userId) throw new HttpError('Token inválido', 401);

    const nome = typeof body?.name === 'string' ? body.name.trim() : '';
    const plantId = typeof body?.plant_id === 'string' ? body.plant_id : '';
    const listName =
      typeof body?.list_name === 'string' && body.list_name.trim() ? body.list_name.trim() : nome;

    const campos: Record<string, string> = {};
    if (!nome || nome.length < 2) campos.name = 'obrigatório, mínimo 2 caracteres';
    if (!plantId) campos.plant_id = 'obrigatório';

    if (Object.keys(campos).length > 0) {
      throw erroDeCampos(campos, 'CANTEIRO_INVALIDO');
    }

    const planta = await this.plantaRepo.findById(plantId);
    if (!planta) throw new HttpError('Planta não encontrada', 404);

    return this.repo.createComListaETransacao({ name: nome, plant_id: plantId, userId, listName });
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

  /** A lista mais recente do canteiro que já tem formulário preenchido. */
  async findListaComFormularios(canteiroId: string) {
    const listas = await this.repo.findListasByCanteiro(canteiroId);
    const lista = listas.find((l: any) => (l._count?.formularios ?? 0) > 0);

    if (!lista) {
      throw new HttpError('O canteiro ainda não tem formulários preenchidos', 422);
    }

    return lista;
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
