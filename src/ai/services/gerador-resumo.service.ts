// Regra de negócio do resumo: valida o dossiê, monta o prompt, chama o
// provedor escolhido e confere se a resposta tem as quatro seções. Não sabe
// qual API está por trás — isso fica em llm/.
//
// Espelha ai-service/services/resumo_service.py: antes rodava num processo
// Python separado chamado por HTTP; agora roda dentro do próprio Nest, na
// mesma função serverless da Vercel.

import { Injectable } from '@nestjs/common';

import { DossieInvalido, FalhaNoModelo } from '../core/erros';
import { obterProvedor } from '../llm';
import { montarMensagens, PROMPT_VERSAO } from '../prompts/resumo';
import { Dossie, DOSSIE_VERSAO_SUPORTADA, paraSecoes, RespostaResumo } from '../schemas/dossie';

@Injectable()
export class GeradorResumoService {
  validarDossie(dossie: Dossie): void {
    if (dossie.versao !== DOSSIE_VERSAO_SUPORTADA) {
      throw new DossieInvalido(
        `Versão de dossiê ${dossie.versao} não suportada (este gerador espera ${DOSSIE_VERSAO_SUPORTADA})`,
      );
    }
    if (dossie.metricas.length === 0 && dossie.observacoes.length === 0) {
      throw new DossieInvalido('Dossiê sem métricas e sem observações: nada a resumir');
    }
  }

  async gerar(dossie: Dossie, provedor?: string | null): Promise<RespostaResumo> {
    this.validarDossie(dossie);
    const llm = obterProvedor(provedor);

    const inicio = Date.now();
    const resposta = await llm.gerarJson(montarMensagens(dossie));
    const duracaoMs = Date.now() - inicio;

    let bruto: unknown;
    try {
      bruto = JSON.parse(resposta.conteudo);
    } catch {
      throw new FalhaNoModelo(`Modelo não devolveu JSON válido: ${resposta.conteudo.slice(0, 200)}`);
    }

    let secoes;
    try {
      secoes = paraSecoes(bruto);
    } catch (e: any) {
      throw new FalhaNoModelo(e?.message ?? 'JSON fora do formato esperado');
    }

    return {
      secoes,
      provedor: llm.nome,
      modelo: resposta.modelo,
      prompt_versao: PROMPT_VERSAO,
      tokens_entrada: resposta.tokensEntrada,
      tokens_saida: resposta.tokensSaida,
      duracao_ms: duracaoMs,
    };
  }
}
