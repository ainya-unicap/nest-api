import { Injectable, Logger } from '@nestjs/common';

import { ResumoIaRepository } from '../repositories/resumoia.repository';
import { UserCanteiroRepository } from '../repositories/usercanteiro.repository';
import { DossieService } from './dossie.service';
import { HttpError } from '../core/httpError';
import { GeradorResumoService } from '../ai/services/gerador-resumo.service';
import { Dossie } from '../ai/schemas/dossie';

export const STATUS = {
  PENDENTE: 'PENDENTE',
  PROCESSANDO: 'PROCESSANDO',
  PRONTO: 'PRONTO',
  ERRO: 'ERRO',
} as const;

@Injectable()
export class ResumoIaService {
  private readonly logger = new Logger(ResumoIaService.name);
  private readonly repo = new ResumoIaRepository();
  private readonly userCanteiroRepo = new UserCanteiroRepository();

  constructor(
    private readonly dossieService: DossieService,
    private readonly geradorResumoService: GeradorResumoService,
  ) {}

  /**
   * Cria o registro e devolve na hora. A chamada ao modelo roda depois, fora do
   * ciclo da requisição: a Vercel Hobby corta em 10s e a Groq demora mais que
   * isso para um texto deste tamanho.
   */
  async solicitar(listId: string, userId: string) {
    // Monta o dossiê antes de gravar: é aqui que 403/404/422 aparecem, e não
    // faz sentido criar um registro PENDENTE que já nasce inválido.
    const dossie = await this.dossieService.montar(listId, userId);

    const resumo = await this.repo.criar({
      list_id: listId,
      user_id: userId,
      status: STATUS.PENDENTE,
      dossie: dossie as any,
    });

    void this.processar(resumo.id);

    return { id: resumo.id, status: resumo.status, createdAt: resumo.createdAt };
  }

  async consultar(id: string, userId: string) {
    const resumo = await this.repo.findById(id);
    if (!resumo) throw new HttpError('Resumo não encontrado', 404);

    // Quem pediu vê o seu; os demais precisam ter acesso à lista de origem.
    if (resumo.user_id !== userId) {
      await this.dossieService.montar(resumo.list_id, userId);
    }

    return {
      id: resumo.id,
      list_id: resumo.list_id,
      status: resumo.status,
      secoes: resumo.secoes,
      modelo: resumo.modelo,
      prompt_versao: resumo.prompt_versao,
      tokens_entrada: resumo.tokens_entrada,
      tokens_saida: resumo.tokens_saida,
      duracao_ms: resumo.duracao_ms,
      erro: resumo.erro,
      createdAt: resumo.createdAt,
      concluidoEm: resumo.concluidoEm,
    };
  }

  async listarPorLista(listId: string, userId: string) {
    await this.dossieService.montar(listId, userId); // valida o acesso à lista
    return this.repo.findByLista(listId);
  }

  /**
   * Fluxo pelo canteiro: o usuário escolhe o canteiro e o sistema descobre a
   * lista de formulários dele. Daí em diante é o mesmo `solicitar` da lista.
   */
  async solicitarPorCanteiro(canteiroId: string, userId: string) {
    await this.validarAcessoCanteiro(canteiroId, userId);

    const lista = await this.repo.findListaComFormularios(canteiroId);
    if (!lista) {
      throw new HttpError('O canteiro ainda não tem formulários preenchidos', 422);
    }

    const resumo = await this.solicitar(lista.id, userId);
    return { ...resumo, list_id: lista.id, canteiro_id: canteiroId };
  }

  async listarPorCanteiro(canteiroId: string, userId: string) {
    await this.validarAcessoCanteiro(canteiroId, userId);
    return this.repo.findByCanteiro(canteiroId);
  }

  /**
   * Re-dispara um resumo que ficou em ERRO — ou preso em PROCESSANDO porque o
   * processo morreu no meio (cold start da serverless, deploy, queda de rede).
   */
  async reprocessar(id: string, userId: string) {
    const resumo = await this.repo.findById(id);
    if (!resumo) throw new HttpError('Resumo não encontrado', 404);

    await this.dossieService.montar(resumo.list_id, userId); // valida o acesso

    if (resumo.status === STATUS.PRONTO) {
      throw new HttpError('Este resumo já está pronto; gere um novo se quiser refazer', 400);
    }

    void this.processar(id);
    return { id, status: STATUS.PENDENTE };
  }

  // ---------------------------------------------------------------------------

  // Mesma regra do dossiê: basta estar vinculado ao canteiro.
  private async validarAcessoCanteiro(canteiroId: string, userId: string) {
    if (!userId) throw new HttpError('userId é obrigatório', 400);

    const canteiro = await this.repo.findCanteiro(canteiroId);
    if (!canteiro) throw new HttpError('Canteiro não encontrado', 404);

    const vinculado = await this.userCanteiroRepo.exists(userId, canteiroId);
    if (!vinculado) throw new HttpError('Usuário não está vinculado a este canteiro', 403);
  }

  private async processar(id: string) {
    try {
      await this.repo.atualizar(id, { status: STATUS.PROCESSANDO });

      const resumo = await this.repo.findById(id);
      if (!resumo?.dossie) throw new Error('Registro sem dossiê gravado');

      const resposta = await this.geradorResumoService.gerar(resumo.dossie as unknown as Dossie);

      await this.repo.atualizar(id, {
        status: STATUS.PRONTO,
        secoes: resposta.secoes as unknown as Record<string, string>,
        modelo: resposta.modelo,
        prompt_versao: resposta.prompt_versao,
        tokens_entrada: resposta.tokens_entrada,
        tokens_saida: resposta.tokens_saida,
        duracao_ms: resposta.duracao_ms,
        erro: null,
        concluidoEm: new Date(),
      });

      this.logger.log(`Resumo ${id} pronto (${resposta.modelo}, ${resposta.duracao_ms}ms)`);
    } catch (err: any) {
      const mensagem = err?.message ?? 'Falha desconhecida ao gerar o resumo';
      this.logger.error(`Resumo ${id} falhou: ${mensagem}`);

      // O erro fica no registro: o front mostra em vez de girar para sempre.
      await this.repo
        .atualizar(id, { status: STATUS.ERRO, erro: mensagem.slice(0, 1000), concluidoEm: new Date() })
        .catch(() => undefined);
    }
  }

}
