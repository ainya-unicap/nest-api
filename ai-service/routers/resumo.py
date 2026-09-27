from fastapi import APIRouter, Depends

from core.seguranca import conferir_token
from schemas.dossie import PedidoResumo, RespostaResumo
from services.resumo_service import gerar_resumo

router = APIRouter(dependencies=[Depends(conferir_token)])


@router.post("/resumir", response_model=RespostaResumo)
def resumir(pedido: PedidoResumo):
    return gerar_resumo(pedido.dossie, pedido.provedor)
