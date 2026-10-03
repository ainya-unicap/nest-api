// Contrato do dossiê consumido pelo gerador de resumo.
// Espelha o que `src/services/dossie.service.ts` monta (mesmos campos que
// antes eram enviados ao ai-service/schemas/dossie.py).

import { MetricaCategorica, MetricaNumerica } from '../../services/dossie.service';

export const DOSSIE_VERSAO_SUPORTADA = '1';

export interface Ponto {
  data: string;
  valor: number | string;
}

export type Metrica = MetricaNumerica | MetricaCategorica;

export interface Dossie {
  versao: string;
  gerado_em?: string | null;
  lista: { id: string; nome?: string | null };
  planta: { nome: string; categoria: string; descricao: string; foco_semestre: string };
  canteiro: { id: string; nome: string };
  periodo: {
    inicio: string;
    fim: string;
    semanas: number;
    total_formularios: number;
    autores: Array<{ nome: string; formularios: number }>;
  };
  metricas: Metrica[];
  checklist: Array<{ item: string; marcado: number; total: number; pct: number }>;
  observacoes: Array<{ data: string; autor: string; texto: string }>;
  fotos: { total: number };
}

/**
 * As quatro seções da documentação gerada. O modelo devolve cada seção como
 * lista de parágrafos (segue a divisão melhor do que com "\n\n" dentro de uma
 * string); aqui vira texto com linha em branco entre parágrafos, que é o que
 * o resto do Nest grava e o front exibe.
 */
export interface Secoes {
  introducao: string;
  desenvolvimento: string;
  cuidados: string;
  conclusao: string;
}

export interface RespostaResumo {
  secoes: Secoes;
  provedor: string;
  modelo: string;
  prompt_versao: string;
  tokens_entrada: number;
  tokens_saida: number;
  duracao_ms: number;
}

const CHAVES_SECOES = ['introducao', 'desenvolvimento', 'cuidados', 'conclusao'] as const;

/** Junta parágrafo por parágrafo (lista de strings) em texto com linha em branco entre eles. */
function juntarParagrafos(valor: unknown): string {
  if (Array.isArray(valor)) {
    return valor
      .map((p) => String(p).trim())
      .filter(Boolean)
      .join('\n\n');
  }
  return String(valor ?? '');
}

/** Valida e normaliza o JSON bruto devolvido pelo modelo nas quatro seções esperadas. */
export function paraSecoes(bruto: unknown): Secoes {
  if (typeof bruto !== 'object' || bruto === null) {
    throw new Error(`JSON fora do formato esperado: ${JSON.stringify(bruto)}`);
  }

  const objeto = bruto as Record<string, unknown>;
  const faltantes = CHAVES_SECOES.filter((chave) => !(chave in objeto));
  if (faltantes.length > 0) {
    throw new Error(
      `JSON fora do formato esperado (faltam as chaves: ${faltantes.join(', ')}; recebidas: ${Object.keys(objeto).join(', ')})`,
    );
  }

  return {
    introducao: juntarParagrafos(objeto.introducao),
    desenvolvimento: juntarParagrafos(objeto.desenvolvimento),
    cuidados: juntarParagrafos(objeto.cuidados),
    conclusao: juntarParagrafos(objeto.conclusao),
  };
}
