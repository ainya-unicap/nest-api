"""
Erros de domínio. Services e provedores lançam estes, sem depender do FastAPI;
o handler registrado em main.py converte para a resposta HTTP `{ "detail": ... }`
que o Nest já sabe ler.
"""


class ErroServico(Exception):
    status_http = 500

    def __init__(self, mensagem: str):
        super().__init__(mensagem)
        self.mensagem = mensagem


class PedidoInvalido(ErroServico):
    """Provedor desconhecido."""
    status_http = 400


class DossieInvalido(ErroServico):
    """Versão incompatível ou nada a resumir."""
    status_http = 422


class LimiteDeUso(ErroServico):
    status_http = 429


class FalhaNoModelo(ErroServico):
    """O provedor falhou ou devolveu algo fora do formato."""
    status_http = 502


class ProvedorNaoConfigurado(ErroServico):
    """Falta a chave de API do provedor."""
    status_http = 503
