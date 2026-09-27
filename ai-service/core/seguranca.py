from fastapi import Header, HTTPException

from core.config import config


def conferir_token(x_internal_token: str | None = Header(default=None)) -> None:
    """Dependência das rotas. Sem INTERNAL_TOKEN configurado o serviço fica aberto — só aceitável em dev."""
    if not config.internal_token:
        return
    if x_internal_token != config.internal_token:
        raise HTTPException(401, "X-Internal-Token ausente ou inválido")
