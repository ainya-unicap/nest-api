import { Injectable } from '@nestjs/common';
import { CanteiroService } from './canteiro.service';
import { ElizaService } from './eliza.service';
import { RelatorioService } from './relatorio.service';
import { HttpError } from '../core/httpError';

// Aceita o nome em português (com ou sem acento) e em inglês, pra não quebrar
// se o Eliza mudar de grafia de um jeito ou de outro.
const CHAVES: Record<'introduction' | 'objective' | 'development' | 'final_thoughts', string[]> = {
  introduction: ['introdução', 'introducao', 'introduction'],
  objective: ['objetivo', 'objective'],
  development: ['desenvolvimento', 'development'],
  final_thoughts: [
    'considerações finais',
    'considerações_finais',
    'consideracoes finais',
    'consideracoes_finais',
    'final_thoughts',
  ],
};

@Injectable()
export class RelatorioIaService {
  constructor(
    private readonly canteiroService: CanteiroService,
    private readonly elizaService: ElizaService,
    private readonly relatorioService: RelatorioService,
  ) {}

  /**
   * Pede o relatório ao Eliza e grava as 4 seções no Relatorio do canteiro,
   * reaproveitando o RelatorioService (mesma lógica de POST /relatorios/generate
   * e PUT /relatorios/:id) — este service não mexe no banco diretamente.
   */
  async gerar(canteiroId: string, userId: string, accessToken: string) {
    await this.canteiroService.validarAcessoCanteiro(canteiroId, userId);
    const lista = await this.canteiroService.findListaComFormularios(canteiroId);

    const respostaEliza = await this.elizaService.gerarRelatorio(canteiroId, accessToken);
    const secoes = this.extrairSecoes(respostaEliza);

    const relatorio = await this.relatorioService.createRelatorio(userId, lista.id);
    return this.relatorioService.update(relatorio.id, userId, secoes);
  }

  private extrairSecoes(resposta: unknown) {
    const objeto = (typeof resposta === 'object' && resposta !== null ? resposta : {}) as Record<
      string,
      unknown
    >;

    const pick = (chaves: string[]): string => {
      for (const chave of chaves) {
        const valor = objeto[chave];
        if (typeof valor === 'string' && valor.trim().length > 0) return valor;
      }
      return '';
    };

    const secoes = {
      introduction: pick(CHAVES.introduction),
      objective: pick(CHAVES.objective),
      development: pick(CHAVES.development),
      final_thoughts: pick(CHAVES.final_thoughts),
    };

    const vazio = Object.values(secoes).every((v) => v === '');
    if (vazio) {
      throw new HttpError(
        'O Eliza não devolveu as seções esperadas (introdução, objetivo, desenvolvimento, considerações finais)',
        502,
        { codigo: 'ELIZA_FORMATO_INESPERADO' },
      );
    }

    return secoes;
  }
}
