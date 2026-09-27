import { Injectable, Logger } from '@nestjs/common';

import { ResumoIaRepository } from '../repositories/resumoia.repository';
import { UserCanteiroRepository } from '../repositories/usercanteiro.repository';
import { DossieService } from './dossie.service';
import { HttpError } from '../core/httpError';

export const STATUS = {
  PENDENTE: 'PENDENTE',
  PROCESSANDO: 'PROCESSANDO',
  PRONTO: 'PRONTO',
  ERRO: 'ERRO',
} as const;

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';
const AI_INTERNAL_TOKEN = process.env.AI_INTERNAL_TOKEN ?? '';
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 120_000);

@Injectable()
export class ResumoIaService {
  private readonly logger = new Logger(ResumoIaService.name);
  private readonly repo = new ResumoIaRepository();
  private readonly userCanteiroRepo = new UserCanteiroRepository();

  constructor(private readonly dossieService: DossieService) {}

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

      const resposta = await this.chamarServicoIA(resumo.dossie);

      await this.repo.atualizar(id, {
        status: STATUS.PRONTO,
        secoes: resposta.secoes,
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

  private async chamarServicoIA(dossie: unknown) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
      const resposta = await fetch(`${AI_SERVICE_URL}/resumir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(AI_INTERNAL_TOKEN ? { 'X-Internal-Token': AI_INTERNAL_TOKEN } : {}),
        },
        body: JSON.stringify({ dossie }),
        signal: controller.signal,
      });

      const texto = await resposta.text();

      if (!resposta.ok) {
        // O FastAPI devolve { detail: "..." }; repassar isso ajuda a diagnosticar.
        let detalhe = texto.slice(0, 300);
        try {
          detalhe = JSON.parse(texto).detail ?? detalhe;
        } catch {
          /* corpo não-JSON: mantém o texto cru */
        }
        throw new Error(`ai-service respondeu ${resposta.status}: ${detalhe}`);
      }

      return JSON.parse(texto) as {
        secoes: Record<string, string>;
        modelo: string;
        prompt_versao: string;
        tokens_entrada: number;
        tokens_saida: number;
        duracao_ms: number;
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error(`ai-service não respondeu em ${AI_TIMEOUT_MS}ms`);
      }
      if (err instanceof TypeError) {
        throw new Error(`ai-service inacessível em ${AI_SERVICE_URL} — ele está rodando?`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
