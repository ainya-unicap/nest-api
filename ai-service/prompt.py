"""
Construção do prompt. Isolado num módulo só para dar para versionar e comparar
saídas quando o texto mudar — sempre suba PROMPT_VERSAO junto com uma alteração
que mude o estilo ou as regras.
"""
from schemas import Dossie

PROMPT_VERSAO = "1.0.0"

SISTEMA = """Você é um agrônomo que redige documentação técnica sobre o cultivo e o \
manejo de plantas forrageiras, em português do Brasil.

Você recebe um dossiê em JSON com os dados de um acompanhamento real feito por \
estudantes: espécie cultivada, período, métricas medidas semana a semana, \
percentuais de checklist e as observações escritas em campo.

REGRAS OBRIGATÓRIAS:
1. Use APENAS os dados do dossiê. Nunca invente medições, datas, doses ou eventos.
2. Os números já vêm calculados (primeiro, ultimo, min, max, media, variacao_pct). \
Cite-os como estão; não refaça contas nem arredonde de outro jeito.
3. Sempre informe a unidade ao citar um valor (cm, %, unidade...).
4. As observações de campo são a fonte dos eventos (pragas, chuva, adubação, \
corte, estiagem). Relacione-as com o que as métricas mostram na mesma data.
5. Se uma métrica cair e a observação explicar o motivo, diga o motivo. Não \
trate queda como erro sem evidência.
6. Não faça recomendações que dependam de dados ausentes (análise de solo, \
clima regional, custo). Se algo relevante não foi medido, aponte como lacuna.
7. Tom técnico e objetivo. Sem saudação, sem "como IA", sem meta-comentário.
8. Não invente nomes científicos que não estejam no dossiê.

FORMATO DA RESPOSTA — responda SOMENTE com um objeto JSON válido, sem markdown, \
sem crase, com exatamente estas quatro chaves de texto:

{
  "introducao": "Espécie, categoria, canteiro, período e o que foi acompanhado. 1 parágrafo.",
  "desenvolvimento": "Como a planta evoluiu: cite as métricas com números e datas, relacione com os eventos das observações. 2 a 4 parágrafos.",
  "cuidados": "Práticas de manejo efetivamente registradas e o que elas produziram; lacunas de acompanhamento. 1 a 3 parágrafos.",
  "conclusao": "Síntese do desempenho no período e recomendações para o próximo ciclo, ancoradas nos dados. 1 parágrafo."
}"""


def _formatar_metricas(dossie: Dossie) -> str:
    linhas = []
    for m in dossie.metricas:
        if m.tipo == "numerico":
            variacao = f"{m.variacao_pct}%" if m.variacao_pct is not None else "n/d"
            serie = ", ".join(f"{p.data}={p.valor}" for p in m.serie)
            linhas.append(
                f"- {m.campo} ({m.unidade}): inicial {m.primeiro}, final {m.ultimo}, "
                f"mínimo {m.min}, máximo {m.max}, média {m.media}, variação {variacao} "
                f"[{m.leituras} leituras]\n    série: {serie}"
            )
        else:
            serie = ", ".join(f"{p.data}={p.valor}" for p in m.serie)
            linhas.append(
                f"- {m.campo} (categórico; opções: {', '.join(m.opcoes)}): "
                f"de '{m.primeiro}' para '{m.ultimo}' [{m.leituras} leituras]\n    série: {serie}"
            )
    return "\n".join(linhas) or "(nenhuma métrica registrada)"


def montar_mensagens(dossie: Dossie) -> list[dict]:
    """
    O dossiê vai como texto estruturado, não como JSON cru: o modelo erra menos
    lendo rótulos em português do que percorrendo um objeto aninhado.
    """
    checklist = (
        "\n".join(f"- {c.item}: {c.marcado}/{c.total} ({c.pct}%)" for c in dossie.checklist)
        or "(sem itens de checklist)"
    )
    observacoes = (
        "\n".join(f"- {o.data} ({o.autor}): {o.texto}" for o in dossie.observacoes)
        or "(sem observações de campo)"
    )
    autores = ", ".join(f"{a.nome} ({a.formularios} formulários)" for a in dossie.periodo.autores)

    usuario = f"""ESPÉCIE
Nome: {dossie.planta.nome}
Categoria: {dossie.planta.categoria}
Foco de semestre: {dossie.planta.foco_semestre}
Descrição de referência: {dossie.planta.descricao}

LOCAL E PERÍODO
Canteiro: {dossie.canteiro.nome}
Acompanhamento: {dossie.periodo.inicio} a {dossie.periodo.fim} \
({dossie.periodo.semanas} semanas, {dossie.periodo.total_formularios} formulários)
Responsáveis: {autores or 'não informado'}
Fotos anexadas: {dossie.fotos.total}

MÉTRICAS MEDIDAS
{_formatar_metricas(dossie)}

CHECKLIST (frequência de verificação)
{checklist}

OBSERVAÇÕES DE CAMPO
{observacoes}

Redija a documentação sobre o cultivo e os cuidados desta planta seguindo as \
regras e devolvendo apenas o JSON com as quatro seções."""

    return [
        {"role": "system", "content": SISTEMA},
        {"role": "user", "content": usuario},
    ]
