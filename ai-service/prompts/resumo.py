"""
Construção do prompt. Isolado num módulo só para dar para versionar e comparar
saídas quando o texto mudar — sempre suba PROMPT_VERSAO junto com uma alteração
que mude o estilo ou as regras.

Princípio: o modelo só redige. Tudo que envolve conta ou comparação (diferenças,
mudanças de estádio, semanas sem checklist) é resolvido aqui em Python e entregue
pronto no texto — o modelo erra aritmética e mistura valores entre métricas.
"""
from schemas.dossie import Dossie

PROMPT_VERSAO = "1.1.0"

SISTEMA = """Você redige, em português do Brasil, a documentação do cultivo de uma \
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
}"""


def _num(valor: float | int | str) -> str:
    """8.0 → '8'; 58.08 → '58,08'. Vírgula decimal: o modelo tende a copiar o formato."""
    if isinstance(valor, str):
        return valor
    if float(valor).is_integer():
        return str(int(valor))
    return f"{valor}".replace(".", ",")


def _data(iso: str) -> str:
    """'2026-03-14' → '14/03/2026'."""
    ano, mes, dia = iso[:10].split("-")
    return f"{dia}/{mes}/{ano}"


def _com_unidade(valor: float | int, unidade: str) -> str:
    if unidade == "%":
        return f"{_num(valor)} %"
    if unidade == "unidade" and valor != 1:
        return f"{_num(valor)} unidades"
    return f"{_num(valor)} {unidade}"


def _formatar_metricas(dossie: Dossie) -> str:
    """
    Cada valor vai com a própria unidade e dentro do bloco da sua métrica, para o
    modelo não trocar valores entre métricas (ex.: altura citada como entrenó).
    """
    blocos = []
    for m in dossie.metricas:
        if m.tipo == "numerico":
            u = m.unidade
            variacao = (
                f"{_num(m.variacao_pct)} %" if m.variacao_pct is not None else "não calculada"
            )
            valores = "\n".join(f"    {_data(p.data)}: {_com_unidade(p.valor, u)}" for p in m.serie)
            blocos.append(
                f"### {m.campo} (unidade: {u}) — {m.leituras} leituras\n"
                f"  Inicial: {_com_unidade(m.primeiro, u)} | Final: {_com_unidade(m.ultimo, u)}\n"
                f"  Máximo: {_com_unidade(m.max, u)} | Mínimo: {_com_unidade(m.min, u)} | "
                f"Média: {_com_unidade(m.media, u)}\n"
                f"  Variação no período (inicial → final): {variacao}\n"
                f"  Valores de {m.campo}:\n{valores}"
            )
        else:
            valores = "\n".join(f"    {_data(p.data)}: {p.valor}" for p in m.serie)
            mudancas = [
                f"{_data(atual.data)}: de '{anterior.valor}' para '{atual.valor}'"
                for anterior, atual in zip(m.serie, m.serie[1:])
                if atual.valor != anterior.valor
            ]
            blocos.append(
                f"### {m.campo} (categórico; opções: {', '.join(m.opcoes)}) — {m.leituras} leituras\n"
                f"  Inicial: {m.primeiro} | Final: {m.ultimo}\n"
                f"  Mudanças de estádio: {'; '.join(mudancas) or 'nenhuma'}\n"
                f"  Valores de {m.campo}:\n{valores}"
            )
    return "\n\n".join(blocos) or "(nenhuma métrica registrada)"


def _formatar_checklist(dossie: Dossie) -> tuple[str, list[str]]:
    """Devolve o texto do checklist e as lacunas que ele revela."""
    linhas, lacunas = [], []
    for c in dossie.checklist:
        faltou = c.total - c.marcado
        linhas.append(
            f"- {c.item}: verificado em {c.marcado} de {c.total} formulários ({_num(c.pct)} %)"
        )
        if faltou > 0:
            lacunas.append(
                f"o item '{c.item}' do checklist ficou sem marcar em {faltou} dos "
                f"{c.total} formulários. AÇÃO: marcar o item '{c.item}' do checklist "
                "em todos os formulários"
            )
    return "\n".join(linhas) or "(sem itens de checklist)", lacunas


def montar_mensagens(dossie: Dossie) -> list[dict]:
    """
    O dossiê vai como texto estruturado, não como JSON cru: o modelo erra menos
    lendo rótulos em português do que percorrendo um objeto aninhado.
    """
    checklist, lacunas = _formatar_checklist(dossie)
    if not dossie.checklist:
        lacunas.append(
            "nenhum item de checklist foi registrado. AÇÃO: preencher o checklist em cada formulário"
        )
    if not dossie.observacoes:
        lacunas.append(
            "nenhuma observação de campo foi registrada. AÇÃO: descrever em cada formulário "
            "os eventos e manejos da semana"
        )
    if dossie.fotos.total == 0:
        lacunas.append(
            "nenhuma foto foi anexada aos formulários. AÇÃO: anexar fotos do canteiro "
            "aos formulários"
        )

    observacoes = (
        "\n".join(f"- {_data(o.data)} ({o.autor}): {o.texto}" for o in dossie.observacoes)
        or "(sem observações de campo)"
    )
    autores = ", ".join(f"{a.nome} ({a.formularios} formulários)" for a in dossie.periodo.autores)
    nomes_metricas = ", ".join(m.campo for m in dossie.metricas) or "nenhuma"
    p = dossie.periodo

    usuario = f"""DOSSIÊ

ESPÉCIE
Nome: {dossie.planta.nome}
Categoria: {dossie.planta.categoria}
Foco de semestre: {dossie.planta.foco_semestre}
Descrição de referência: {dossie.planta.descricao}

LOCAL E PERÍODO
Canteiro: {dossie.canteiro.nome}
Acompanhamento: de {_data(p.inicio)} a {_data(p.fim)} ({p.semanas} semanas, \
{p.total_formularios} formulários)
Responsáveis: {autores or 'não informado'}
Fotos anexadas: {dossie.fotos.total}

MÉTRICAS MEDIDAS ({len(dossie.metricas)}): {nomes_metricas}

{_formatar_metricas(dossie)}

CHECKLIST
{checklist}

OBSERVAÇÕES DE CAMPO ({len(dossie.observacoes)})
{observacoes}

LACUNAS DO ACOMPANHAMENTO
{chr(10).join(f'- LACUNA: {l}' for l in lacunas) or '- nenhuma identificada nos dados'}

Redija a documentação seguindo as regras. Antes de responder, confira: todas as \
{len(dossie.metricas)} métricas e todas as {len(dossie.observacoes)} observações \
foram citadas? Cada número citado está escrito no dossiê, na métrica certa? \
Devolva apenas o JSON com as quatro seções."""

    return [
        {"role": "system", "content": SISTEMA},
        {"role": "user", "content": usuario},
    ]
