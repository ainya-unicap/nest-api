"""
Provedores de LLM disponíveis. Para adicionar um novo: crie `llm/<nome>_llm.py`
com uma subclasse de ProvedorLLM, adicione a config em core/config.py e
registre aqui.
"""
from core.config import config
from core.erros import PedidoInvalido
from llm.base import ProvedorLLM, RespostaLLM
from llm.gemini_llm import GeminiLLM
from llm.groq_llm import GroqLLM

PROVEDORES: dict[str, ProvedorLLM] = {
    "groq": GroqLLM(config.groq),
    "gemini": GeminiLLM(config.gemini),
}


def obter_provedor(nome: str | None = None) -> ProvedorLLM:
    """Sem nome, usa o LLM_PROVIDER do .env."""
    chave = (nome or config.provedor_padrao).strip().lower()
    provedor = PROVEDORES.get(chave)
    if provedor is None:
        raise PedidoInvalido(
            f"Provedor '{chave}' desconhecido. Disponíveis: {', '.join(PROVEDORES)}"
        )
    return provedor


__all__ = ["PROVEDORES", "ProvedorLLM", "RespostaLLM", "obter_provedor"]
