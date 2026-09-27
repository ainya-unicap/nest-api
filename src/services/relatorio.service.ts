import { Injectable } from '@nestjs/common';
import { RelatorioRepository } from '../repositories/relatorio.repository';
import { UserCanteiroRepository } from '../repositories/usercanteiro.repository';
import { HttpError } from '../core/httpError';

const SECOES_VALIDAS = [
  'introduction',
  'objective',
  'development',
  'final_thoughts',
  'references',
] as const;

type Secao = (typeof SECOES_VALIDAS)[number];

const STATUS_FECHADOS = ['SUBMETIDO', 'CORRIGIDO'];

@Injectable()
export class RelatorioService {
  private readonly repo = new RelatorioRepository();
  private readonly userCanteiroRepo = new UserCanteiroRepository();

  getRelatoriosByUser(userId: string) {
    if (!userId) throw new HttpError('userId é obrigatório', 400);
    return this.repo.getRelatoriosByUser(userId);
  }

  // A tabela Relatorio tem 9 colunas NOT NULL sem default (canteiro_id, as 5
  // seções, grade, feedback e submittedAt). Todas precisam sair daqui.
  async createRelatorio(userId: string, listId: string) {
    if (!userId) throw new HttpError('userId é obrigatório', 400);
    if (!listId) throw new HttpError('list_id é obrigatório', 400);

    const lista = await this.repo.findListaComPlanta(listId);
    if (!lista) throw new HttpError('Lista de formulários não encontrada.', 404);

    const vinculado = await this.userCanteiroRepo.exists(userId, lista.canteiro_id);
    if (!vinculado) {
      throw new HttpError('Usuário não está vinculado ao canteiro da lista informada', 403);
    }

    const objetivoGerado =
      `Acompanhar e registrar o desenvolvimento de ${lista.plant.name} ao longo do semestre, ` +
      'documentando medições semanais de altura, cobertura do solo e estádio fenológico.';

    return this.repo.createRelatorio({
      user_id: userId,
      list_id: listId,
      canteiro_id: lista.canteiro_id,
      status: 'RASCUNHO',
      objective: objetivoGerado,
      introduction: '',
      development: '',
      final_thoughts: '',
      references: '',
      grade: 0,
      feedback: '',
      submittedAt: new Date(),
    });
  }

  async getRelatorioById(id: string) {
    if (!id) throw new HttpError('id é obrigatório', 400);

    const relatorio = await this.repo.findById(id);
    if (!relatorio) throw new HttpError('Relatório não encontrado.', 404);

    return relatorio;
  }

  async updateObjective(id: string, userId: string, novoObjetivo: string) {
    await this.assertEditavel(id, userId);
    return this.repo.update(id, { objective: novoObjetivo });
  }

  async updateSection(id: string, userId: string, secao: string, valor: string) {
    if (!SECOES_VALIDAS.includes(secao as Secao)) {
      throw new HttpError(`Seção inválida. Use: ${SECOES_VALIDAS.join(', ')}`, 400);
    }
    if (typeof valor !== 'string') {
      throw new HttpError('O valor da seção deve ser texto', 400);
    }

    await this.assertEditavel(id, userId);
    return this.repo.update(id, { [secao]: valor });
  }

  async update(id: string, userId: string, body: any) {
    await this.assertEditavel(id, userId);

    const data: Record<string, string> = {};
    for (const secao of SECOES_VALIDAS) {
      if (typeof body?.[secao] === 'string') data[secao] = body[secao];
    }

    if (Object.keys(data).length === 0) {
      throw new HttpError('Nenhum campo válido enviado para atualização', 400);
    }

    return this.repo.update(id, data);
  }

  async submit(id: string, userId: string) {
    const relatorio = await this.assertOwnership(id, userId);
    if (STATUS_FECHADOS.includes(relatorio.status)) {
      throw new HttpError('Relatório já foi submetido', 400);
    }

    return this.repo.update(id, { status: 'SUBMETIDO', submittedAt: new Date() });
  }

  // Submetido/corrigido não pode ser apagado: preserva o histórico acadêmico.
  async delete(id: string, userId: string) {
    const relatorio = await this.assertOwnership(id, userId);
    if (relatorio.status !== 'RASCUNHO') {
      throw new HttpError('Não é possível excluir um relatório já submetido ou corrigido', 400);
    }

    return this.repo.delete(id);
  }

  private async assertOwnership(id: string, userId: string) {
    if (!id) throw new HttpError('id é obrigatório', 400);
    if (!userId) throw new HttpError('userId é obrigatório', 400);

    const relatorio = await this.repo.findRaw(id);
    if (!relatorio) throw new HttpError('Relatório não encontrado', 404);
    if (relatorio.user_id !== userId) {
      throw new HttpError('Você só pode alterar os próprios relatórios', 403);
    }

    return relatorio;
  }

  private async assertEditavel(id: string, userId: string) {
    const relatorio = await this.assertOwnership(id, userId);
    if (STATUS_FECHADOS.includes(relatorio.status)) {
      throw new HttpError('Não é possível editar um relatório já submetido', 400);
    }

    return relatorio;
  }
}
