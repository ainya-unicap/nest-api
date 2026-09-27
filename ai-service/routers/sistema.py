from fastapi import APIRouter, Depends

from core.config import config
from core.seguranca import conferir_token
from llm import PROVEDORES, obter_provedor
from prompts.resumo import PROMPT_VERSAO
from schemas.dossie import DOSSIE_VERSAO_SUPORTADA

router = APIRouter()


@router.get("/health")
def health():
    padrao = obter_provedor()
    return {
        "status": "ok",
        "provedor_padrao": padrao.nome,
        "modelo": padrao.modelo,
        "prompt_versao": PROMPT_VERSAO,
        "dossie_versao_suportada": DOSSIE_VERSAO_SUPORTADA,
        "provedores": {
            nome: {"modelo": p.modelo, "chave_configurada": p.configurado}
            for nome, p in PROVEDORES.items()
        },
        "token_interno_configurado": bool(config.internal_token),
    }


@router.get("/modelos", dependencies=[Depends(conferir_token)])
def modelos(provedor: str | None = None):
    """Lista os modelos que a chave enxerga — útil para confirmar o id antes de trocar."""
    llm = obter_provedor(provedor)
    return {"provedor": llm.nome, "modelos": llm.listar_modelos()}
