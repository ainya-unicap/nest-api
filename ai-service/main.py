"""
Serviço de IA do DonkeyCode.

Recebe o dossiê montado pelo Nest e devolve a documentação em quatro seções,
gerada por um modelo da Groq.

    uvicorn main:app --reload --port 8000

Não é exposto ao front: só o Nest chama, autenticado por um segredo compartilhado
no header X-Internal-Token.
"""
import json
import os
import time

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from groq import APIStatusError, Groq, RateLimitError

from prompt import PROMPT_VERSAO, montar_mensagens
from schemas import DOSSIE_VERSAO_SUPORTADA, PedidoResumo, RespostaResumo, Secoes

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
# Família Llama na Groq. Trocar o modelo é só mudar esta variável — GET /modelos
# lista o que a sua chave enxerga hoje.
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")
TEMPERATURA = float(os.getenv("GROQ_TEMPERATURE", "0.3"))
MAX_TOKENS = int(os.getenv("GROQ_MAX_TOKENS", "2000"))

app = FastAPI(title="DonkeyCode AI Service", version="1.0.0")

_cliente: Groq | None = None


def cliente() -> Groq:
    """Instancia preguiçosamente para o serviço subir mesmo sem a chave."""
    global _cliente
    if not GROQ_API_KEY:
        raise HTTPException(503, "GROQ_API_KEY não configurada no ai-service/.env")
    if _cliente is None:
        _cliente = Groq(api_key=GROQ_API_KEY)
    return _cliente


def conferir_token(recebido: str | None) -> None:
    """Sem INTERNAL_TOKEN configurado o serviço fica aberto — só aceitável em dev."""
    if not INTERNAL_TOKEN:
        return
    if recebido != INTERNAL_TOKEN:
        raise HTTPException(401, "X-Internal-Token ausente ou inválido")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "modelo": GROQ_MODEL,
        "prompt_versao": PROMPT_VERSAO,
        "dossie_versao_suportada": DOSSIE_VERSAO_SUPORTADA,
        "groq_key_configurada": bool(GROQ_API_KEY),
        "token_interno_configurado": bool(INTERNAL_TOKEN),
    }


@app.get("/modelos")
def modelos(x_internal_token: str | None = Header(default=None)):
    """Lista os modelos que a chave enxerga — útil para confirmar o id antes de trocar."""
    conferir_token(x_internal_token)
    dados = cliente().models.list()
    return {"modelos": sorted(m.id for m in dados.data)}


@app.post("/resumir", response_model=RespostaResumo)
def resumir(pedido: PedidoResumo, x_internal_token: str | None = Header(default=None)):
    conferir_token(x_internal_token)
    dossie = pedido.dossie

    if dossie.versao != DOSSIE_VERSAO_SUPORTADA:
        raise HTTPException(
            422,
            f"Versão de dossiê {dossie.versao} não suportada "
            f"(este serviço espera {DOSSIE_VERSAO_SUPORTADA})",
        )

    if not dossie.metricas and not dossie.observacoes:
        raise HTTPException(422, "Dossiê sem métricas e sem observações: nada a resumir")

    # Fora do try: o 503 de "chave não configurada" precisa chegar assim ao Nest,
    # em vez de virar um 502 genérico de "falha ao chamar a Groq".
    groq = cliente()

    inicio = time.monotonic()
    try:
        resposta = groq.chat.completions.create(
            model=GROQ_MODEL,
            messages=montar_mensagens(dossie),
            # JSON mode: garante objeto válido em vez de texto com crases em volta.
            response_format={"type": "json_object"},
            temperature=TEMPERATURA,
            max_tokens=MAX_TOKENS,
        )
    except RateLimitError as e:
        raise HTTPException(429, f"Limite de uso da Groq atingido: {e}") from e
    except APIStatusError as e:
        raise HTTPException(502, f"Groq respondeu {e.status_code}: {e}") from e
    except Exception as e:  # rede, DNS, chave inválida
        raise HTTPException(502, f"Falha ao chamar a Groq: {e}") from e

    duracao_ms = int((time.monotonic() - inicio) * 1000)
    conteudo = resposta.choices[0].message.content or ""

    try:
        bruto = json.loads(conteudo)
    except json.JSONDecodeError as e:
        raise HTTPException(502, f"Modelo não devolveu JSON válido: {conteudo[:200]}") from e

    try:
        secoes = Secoes(**bruto)
    except Exception as e:
        raise HTTPException(
            502, f"JSON fora do formato esperado (chaves: {list(bruto)}): {e}"
        ) from e

    uso = resposta.usage
    return RespostaResumo(
        secoes=secoes,
        modelo=resposta.model,
        prompt_versao=PROMPT_VERSAO,
        tokens_entrada=getattr(uso, "prompt_tokens", 0) or 0,
        tokens_saida=getattr(uso, "completion_tokens", 0) or 0,
        duracao_ms=duracao_ms,
    )
