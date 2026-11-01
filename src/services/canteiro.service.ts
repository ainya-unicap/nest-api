import { Injectable } from '@nestjs/common';
import { CanteiroRepository } from '../repositories/canteiro.repository';
import { UserCanteiroRepository } from '../repositories/usercanteiro.repository';
import { PlantaForrageiraRepository } from '../repositories/plantaforrageira.repository';
import { HttpError, erroDeCampos } from '../core/httpError';
import { removeStoredFile } from '../core/storage';

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

  /**
   * Lança 404/403 se o canteiro não existir ou o usuário não estiver vinculado.
   * Devolve o canteiro para quem já precisa dos valores atuais, evitando uma
   * segunda consulta.
   */
  async validarAcessoCanteiro(canteiroId: string, userId: string) {
    if (!canteiroId) throw new HttpError('canteiroId é obrigatório', 400);
    if (!userId) throw new HttpError('userId é obrigatório', 400);

    const canteiro = await this.repo.findById(canteiroId);
    if (!canteiro) throw new HttpError('Canteiro não encontrado', 404);

    const vinculado = await this.userCanteiroRepo.exists(userId, canteiroId);
    if (!vinculado) throw new HttpError('Usuário não está vinculado a este canteiro', 403);

    return canteiro;
  }

  /**
   * Edita nome e/ou planta do canteiro.
   *
   * O canteiro é compartilhado: qualquer pessoa vinculada pode editar, e a
   * alteração aparece para todas as demais.
   *
   * Renomear é sempre permitido. Trocar a planta só enquanto o canteiro não
   * tiver nenhum formulário — depois disso a série de dados já foi coletada
   * para aquela espécie, e trocá-la tornaria o histórico incoerente
   * (um relatório de Palma com medições feitas em Capim).
   */
  async updateCanteiro(canteiroId: string, body: any, userId: string) {
    const canteiro = await this.validarAcessoCanteiro(canteiroId, userId);

    const temNome = body?.name !== undefined && body?.name !== null;
    const temPlanta = body?.plant_id !== undefined && body?.plant_id !== null;

    if (!temNome && !temPlanta) {
      throw new HttpError('Informe name ou plant_id para atualizar', 400, {
        codigo: 'CANTEIRO_INVALIDO',
      });
    }

    const campos: Record<string, string> = {};

    let nome: string | undefined;
    if (temNome) {
      nome = typeof body.name === 'string' ? body.name.trim() : '';
      if (!nome || nome.length < 2) campos.name = 'obrigatório, mínimo 2 caracteres';
    }

    let plantId: string | undefined;
    if (temPlanta) {
      plantId = typeof body.plant_id === 'string' ? body.plant_id.trim() : '';
      if (!plantId) campos.plant_id = 'obrigatório';
    }

    if (Object.keys(campos).length > 0) {
      throw erroDeCampos(campos, 'CANTEIRO_INVALIDO');
    }

    // Só o que mudou de fato é enviado ao repositório.
    const novoNome = nome !== undefined && nome !== canteiro.name ? nome : undefined;
    const novaPlanta =
      plantId !== undefined && plantId !== canteiro.plant_id ? plantId : undefined;

    if (novoNome === undefined && novaPlanta === undefined) {
      const atual = await this.repo.findByIdComDetalhes(canteiroId);
      if (!atual) throw new HttpError('Canteiro não encontrado', 404);
      return atual;
    }

    if (novaPlanta !== undefined) {
      const planta = await this.plantaRepo.findById(novaPlanta);
      if (!planta) throw new HttpError('Planta não encontrada', 404);

      const formularios = await this.repo.contarFormulariosDoCanteiro(canteiroId);
      if (formularios > 0) {
        // 409: o pedido é válido, mas conflita com o estado atual do recurso.
        throw new HttpError(
          'Não é possível trocar a planta: o canteiro já tem formulários',
          409,
          { codigo: 'CANTEIRO_COM_FORMULARIOS' },
        );
      }
    }

    return this.repo.atualizarCanteiro({
      canteiroId,
      nomeAntigo: canteiro.name,
      name: novoNome,
      plant_id: novaPlanta,
    });
  }

  // Se houver outro usuário vinculado, só remove o vínculo de quem pediu
  // (o canteiro continua existindo pros demais). Só apaga o canteiro de
  // verdade quando o usuário do token é o único vinculado — e mesmo assim,
  // nunca se já existir relatório fechado (SUBMETIDO/CORRIGIDO), que é
  // histórico acadêmico e não pode sumir.
  async deleteCanteiro(canteiroId: string, userId: string) {
    await this.validarAcessoCanteiro(canteiroId, userId);

    const temOutroVinculo = await this.repo.temOutroVinculo(canteiroId, userId);
    if (temOutroVinculo) {
      await this.userCanteiroRepo.delete({ user_id: userId, canteiro_id: canteiroId });
      return { message: 'Vínculo removido com sucesso', removido: 'vinculo' as const };
    }

    const temRelatorioFechado = await this.repo.existeRelatorioFechado(canteiroId);
    if (temRelatorioFechado) {
      throw new HttpError(
        'Não é possível excluir: o canteiro tem relatório submetido ou corrigido',
        400,
        { codigo: 'CANTEIRO_COM_RELATORIO_FECHADO' },
      );
    }

    const urlsDasFotos = await this.repo.deleteCanteiroCompleto(canteiroId);

    // Best-effort, depois que a transação já confirmou: se sobrar arquivo
    // órfão em disco/blob, não é motivo pra falhar a exclusão em si.
    await Promise.allSettled(urlsDasFotos.map((url) => removeStoredFile(url)));

    return { message: 'Canteiro excluído com sucesso', removido: 'canteiro' as const };
  }
}
