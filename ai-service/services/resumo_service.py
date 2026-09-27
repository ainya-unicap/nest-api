"""
Regra de negócio do resumo: valida o dossiê, monta o prompt, chama o provedor
escolhido e confere se a resposta tem as quatro seções. Não sabe qual SDK está
por trás — isso fica em llm/.
"""
import json
import time

from core.erros import DossieInvalido, FalhaNoModelo
from llm import obter_provedor
from prompts.resumo import PROMPT_VERSAO, montar_mensagens
from schemas.dossie import DOSSIE_VERSAO_SUPORTADA, Dossie, RespostaResumo, Secoes


def validar_dossie(dossie: Dossie) -> None:
    if dossie.versao != DOSSIE_VERSAO_SUPORTADA:
        raise DossieInvalido(
            f"Versão de dossiê {dossie.versao} não suportada "
            f"(este serviço espera {DOSSIE_VERSAO_SUPORTADA})"
        )
    if not dossie.metricas and not dossie.observacoes:
        raise DossieInvalido("Dossiê sem métricas e sem observações: nada a resumir")


def gerar_resumo(dossie: Dossie, provedor: str | None = None) -> RespostaResumo:
    validar_dossie(dossie)
    llm = obter_provedor(provedor)

    inicio = time.monotonic()
    resposta = llm.gerar_json(montar_mensagens(dossie))
    duracao_ms = int((time.monotonic() - inicio) * 1000)

    try:
        bruto = json.loads(resposta.conteudo)
    except json.JSONDecodeError as e:
        raise FalhaNoModelo(
            f"Modelo não devolveu JSON válido: {resposta.conteudo[:200]}"
        ) from e

    try:
        secoes = Secoes(**bruto)
    except Exception as e:
        raise FalhaNoModelo(
            f"JSON fora do formato esperado (chaves: {list(bruto)}): {e}"
        ) from e

    return RespostaResumo(
        secoes=secoes,
        provedor=llm.nome,
        modelo=resposta.modelo,
        prompt_versao=PROMPT_VERSAO,
        tokens_entrada=resposta.tokens_entrada,
        tokens_saida=resposta.tokens_saida,
        duracao_ms=duracao_ms,
    )
