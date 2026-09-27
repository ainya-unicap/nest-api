"""
Contrato comum dos provedores de LLM. O service só conversa com `ProvedorLLM`;
cada provedor traduz as mensagens e os erros do seu SDK para este formato.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass

from core.config import ConfigProvedor
from core.erros import ProvedorNaoConfigurado


@dataclass
class RespostaLLM:
    conteudo: str
    modelo: str
    tokens_entrada: int
    tokens_saida: int


class ProvedorLLM(ABC):
    # Identificador usado no .env (LLM_PROVIDER), no pedido e na resposta.
    nome: str
    # Nome da variável da chave, para a mensagem de erro dizer o que falta.
    variavel_chave: str

    def __init__(self, cfg: ConfigProvedor):
        self.cfg = cfg
        self._cliente = None

    @property
    def configurado(self) -> bool:
        return bool(self.cfg.api_key)

    @property
    def modelo(self) -> str:
        return self.cfg.modelo

    def cliente(self):
        """Instancia preguiçosamente para o serviço subir mesmo sem a chave."""
        if not self.configurado:
            raise ProvedorNaoConfigurado(
                f"{self.variavel_chave} não configurada no ai-service/.env"
            )
        if self._cliente is None:
            self._cliente = self._criar_cliente()
        return self._cliente

    @abstractmethod
    def _criar_cliente(self): ...

    @abstractmethod
    def gerar_json(self, mensagens: list[dict]) -> RespostaLLM:
        """
        Recebe mensagens no formato [{role: system|user, content}] e devolve o
        texto do modelo, que deve ser um objeto JSON. Erros do SDK saem como
        LimiteDeUso ou FalhaNoModelo.
        """

    @abstractmethod
    def listar_modelos(self) -> list[str]: ...
