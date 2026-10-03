// Construção do prompt. Isolado num módulo só para dar para versionar e
// comparar saídas quando o texto mudar — sempre suba PROMPT_VERSAO junto com
// uma alteração que mude o estilo ou as regras.
//
// Princípio: o modelo só redige. Tudo que envolve conta ou comparação
// (diferenças, mudanças de estádio, semanas sem checklist) é resolvido aqui
// em TypeScript e entregue pronto no texto — o modelo erra aritmética e
// mistura valores entre métricas.
//
// Espelha ai-service/prompts/resumo.py — mesmo texto, mesma versão.

import { MensagemLLM } from '../llm/base';
import { Dossie } from '../schemas/dossie';

export const PROMPT_VERSAO = '1.1.0';

const SISTEMA = `Você redige, em português do Brasil, a documentação do cultivo de uma \
planta forrageira a partir de um DOSSIÊ com os dados reais de um acompanhamento \
feito por estudantes. O texto será usado pelo estudante como base do relatório.

O DOSSIÊ É A ÚNICA FONTE. Se uma informação não está escrita nele, ela não entra \
no texto.

REGRAS DE NÚMEROS
1. Cite somente números que aparecem escritos no dossiê, copiados exatamente como \
estão (inclusive a vírgula decimal) e sempre com a unidade que vem junto.
2. Nunca calcule nada: nada de diferenças ("+15 cm"), somas, médias, percentuais, \
"dobrou", "triplicou". Se quiser falar de variação, use a "variação no período" \
que já vem pronta em cada métrica.
3. Cada valor pertence a UMA métrica. Antes de citar um valor, confira que ele \
está na lista daquela métrica. Nunca use um valor de uma métrica ao falar de outra.

REGRAS DE FATOS
4. Eventos (plantio, chuva, adubação, praga, estiagem, irrigação, corte, \
florescimento) só podem ser citados se estiverem nas OBSERVAÇÕES DE CAMPO, com a \
data da observação.
5. Para relacionar um evento com uma métrica, descreva apenas o que os valores \
mostram nas datas próximas (subiu, caiu, se manteve), conferindo nos valores. \
Não afirme que um manejo "causou", "reverteu" ou "estabilizou" algo, a menos que \
a própria observação diga isso; nesse caso, repita o que a observação diz.
6. Não acrescente conhecimento de fora: nada sobre a espécie além da "descrição \
de referência", nenhum nome científico, dose, técnica ou época que não esteja no \
dossiê.

COBERTURA — NADA PODE FICAR DE FORA
7. Mencione TODAS as métricas da lista, cada uma com valor inicial e final, e com \
o máximo, o mínimo, a média e a variação no período quando existirem.
8. Mencione TODAS as observações de campo, com a data, contando TODA a informação \
de cada uma: eventos, sintomas, pragas, números (mm, kg/ha, %, dias), locais. Pode \
reescrever com outras palavras, mas não pode omitir nenhum detalhe.
9. Cite cada mudança de estádio listada, com a data.
10. Aponte como lacuna tudo o que o dossiê marca como "LACUNA".

RECOMENDAÇÕES (só na conclusão)
11. Recomende apenas: (a) manter os manejos cujo resultado positivo está escrito \
em alguma observação; se nenhuma observação relata o resultado de um manejo, ele \
NÃO entra na recomendação; e (b) as ações indicadas em "AÇÃO" nas lacunas. Nada \
além disso.

ESTILO
12. Escreva em parágrafos corridos, como um relatório — não em listas, tópicos ou \
tabelas. Linguagem simples e direta, frases curtas, tom técnico. Datas no formato \
dd/mm/aaaa. Sem saudação, sem "como IA", sem comentar estas regras.
13. Na parte cronológica, cite NO MÁXIMO 2 valores de métricas por data — os que \
têm relação direta com o evento daquela data (ex.: altura e cobertura no dia do \
corte). Não percorra todas as métricas em todas as datas. Os números completos \
de cada métrica aparecem uma vez só, no parágrafo de resumo por métrica.
14. Cada seção é uma LISTA de parágrafos (veja o formato abaixo).
15. Na introdução, use a descrição de referência numa frase própria, sem parênteses.
16. Prefira um texto mais curto e correto a um texto longo com qualquer informação \
que não esteja no dossiê.

FORMATO DA RESPOSTA — responda SOMENTE com um objeto JSON válido, sem markdown, \
sem crase, com exatamente estas quatro chaves. O valor de cada chave é uma lista \
de strings, uma string por parágrafo:

{
  "introducao": ["1 parágrafo: espécie, descrição de referência, categoria, canteiro, período com as datas de início e fim, número de formulários e a lista das métricas acompanhadas."],
  "desenvolvimento": ["2 a 4 parágrafos em ordem cronológica, agrupando datas próximas: cada observação de campo completa, com a data, e os valores das métricas ligadas a ela nessa data.", "1 parágrafo final com o resumo de cada métrica usando os valores prontos (inicial, final, máximo, mínimo, média, variação no período) e as mudanças de estádio."],
  "cuidados": ["1 parágrafo com cada manejo registrado nas observações, com data e o que a observação diz sobre ele.", "1 parágrafo com as lacunas do acompanhamento (sem as AÇÕES, que ficam na conclusão)."],
  "conclusao": ["1 parágrafo: síntese do período usando só números prontos do dossiê, e as recomendações permitidas pela regra 11."]
}`;

/** 8.0 → '8'; 58.08 → '58,08'. Vírgula decimal: o modelo tende a copiar o formato. */
function num(valor: number | string): string {
  if (typeof valor === 'string') return valor;
  return Number.isInteger(valor) ? String(valor) : String(valor).replace('.', ',');
}

/** '2026-03-14' → '14/03/2026'. */
function data(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

function comUnidade(valor: number, unidade: string): string {
  if (unidade === '%') return `${num(valor)} %`;
  if (unidade === 'unidade' && valor !== 1) return `${num(valor)} unidades`;
  return `${num(valor)} ${unidade}`;
}

/**
 * Cada valor vai com a própria unidade e dentro do bloco da sua métrica, para
 * o modelo não trocar valores entre métricas (ex.: altura citada como entrenó).
 */
function formatarMetricas(dossie: Dossie): string {
  const blocos = dossie.metricas.map((m) => {
    if (m.tipo === 'numerico') {
      const u = m.unidade;
      const variacao = m.variacao_pct !== null ? `${num(m.variacao_pct)} %` : 'não calculada';
      const valores = m.serie.map((p) => `    ${data(p.data)}: ${comUnidade(p.valor, u)}`).join('\n');
      return (
        `### ${m.campo} (unidade: ${u}) — ${m.leituras} leituras\n` +
        `  Inicial: ${comUnidade(m.primeiro, u)} | Final: ${comUnidade(m.ultimo, u)}\n` +
        `  Máximo: ${comUnidade(m.max, u)} | Mínimo: ${comUnidade(m.min, u)} | ` +
        `Média: ${comUnidade(m.media, u)}\n` +
        `  Variação no período (inicial → final): ${variacao}\n` +
        `  Valores de ${m.campo}:\n${valores}`
      );
    }

    const valores = m.serie.map((p) => `    ${data(p.data)}: ${p.valor}`).join('\n');
    const mudancas: string[] = [];
    for (let i = 1; i < m.serie.length; i++) {
      const anterior = m.serie[i - 1];
      const atual = m.serie[i];
      if (atual.valor !== anterior.valor) {
        mudancas.push(`${data(atual.data)}: de '${anterior.valor}' para '${atual.valor}'`);
      }
    }
    return (
      `### ${m.campo} (categórico; opções: ${m.opcoes.join(', ')}) — ${m.leituras} leituras\n` +
      `  Inicial: ${m.primeiro} | Final: ${m.ultimo}\n` +
      `  Mudanças de estádio: ${mudancas.join('; ') || 'nenhuma'}\n` +
      `  Valores de ${m.campo}:\n${valores}`
    );
  });

  return blocos.join('\n\n') || '(nenhuma métrica registrada)';
}

/** Devolve o texto do checklist e as lacunas que ele revela. */
function formatarChecklist(dossie: Dossie): { texto: string; lacunas: string[] } {
  const linhas: string[] = [];
  const lacunas: string[] = [];

  for (const c of dossie.checklist) {
    const faltou = c.total - c.marcado;
    linhas.push(`- ${c.item}: verificado em ${c.marcado} de ${c.total} formulários (${num(c.pct)} %)`);
    if (faltou > 0) {
      lacunas.push(
        `o item '${c.item}' do checklist ficou sem marcar em ${faltou} dos ${c.total} ` +
          `formulários. AÇÃO: marcar o item '${c.item}' do checklist em todos os formulários`,
      );
    }
  }

  return { texto: linhas.join('\n') || '(sem itens de checklist)', lacunas };
}

/**
 * O dossiê vai como texto estruturado, não como JSON cru: o modelo erra menos
 * lendo rótulos em português do que percorrendo um objeto aninhado.
 */
export function montarMensagens(dossie: Dossie): MensagemLLM[] {
  const { texto: checklist, lacunas } = formatarChecklist(dossie);

  if (dossie.checklist.length === 0) {
    lacunas.push('nenhum item de checklist foi registrado. AÇÃO: preencher o checklist em cada formulário');
  }
  if (dossie.observacoes.length === 0) {
    lacunas.push(
      'nenhuma observação de campo foi registrada. AÇÃO: descrever em cada formulário os eventos e manejos da semana',
    );
  }
  if (dossie.fotos.total === 0) {
    lacunas.push('nenhuma foto foi anexada aos formulários. AÇÃO: anexar fotos do canteiro aos formulários');
  }

  const observacoes =
    dossie.observacoes.map((o) => `- ${data(o.data)} (${o.autor}): ${o.texto}`).join('\n') ||
    '(sem observações de campo)';
  const autores =
    dossie.periodo.autores.map((a) => `${a.nome} (${a.formularios} formulários)`).join(', ') || 'não informado';
  const nomesMetricas = dossie.metricas.map((m) => m.campo).join(', ') || 'nenhuma';
  const p = dossie.periodo;

  const usuario = `DOSSIÊ

ESPÉCIE
Nome: ${dossie.planta.nome}
Categoria: ${dossie.planta.categoria}
Foco de semestre: ${dossie.planta.foco_semestre}
Descrição de referência: ${dossie.planta.descricao}

LOCAL E PERÍODO
Canteiro: ${dossie.canteiro.nome}
Acompanhamento: de ${data(p.inicio)} a ${data(p.fim)} (${p.semanas} semanas, ${p.total_formularios} formulários)
Responsáveis: ${autores}
Fotos anexadas: ${dossie.fotos.total}

MÉTRICAS MEDIDAS (${dossie.metricas.length}): ${nomesMetricas}

${formatarMetricas(dossie)}

CHECKLIST
${checklist}

OBSERVAÇÕES DE CAMPO (${dossie.observacoes.length})
${observacoes}

LACUNAS DO ACOMPANHAMENTO
${lacunas.length > 0 ? lacunas.map((l) => `- LACUNA: ${l}`).join('\n') : '- nenhuma identificada nos dados'}

Redija a documentação seguindo as regras. Antes de responder, confira: todas as \
${dossie.metricas.length} métricas e todas as ${dossie.observacoes.length} observações \
foram citadas? Cada número citado está escrito no dossiê, na métrica certa? \
Devolva apenas o JSON com as quatro seções.`;

  return [
    { role: 'system', content: SISTEMA },
    { role: 'user', content: usuario },
  ];
}
