"""
Contrato entre o Nest e este serviço.

Espelha o que `src/services/dossie.service.ts` monta. Mudou lá, muda aqui —
o campo `versao` existe justamente para detectar essa divergência.
"""
from typing import Literal, Optional, Union

from pydantic import BaseModel, Field

DOSSIE_VERSAO_SUPORTADA = "1"


class Ponto(BaseModel):
    data: str
    valor: Union[float, str]


class MetricaNumerica(BaseModel):
    campo: str
    unidade: str
    tipo: Literal["numerico"]
    leituras: int
    primeiro: float
    ultimo: float
    min: float
    max: float
    media: float
    variacao_pct: Optional[float] = None
    serie: list[Ponto]


class MetricaCategorica(BaseModel):
    campo: str
    tipo: Literal["categorico"]
    opcoes: list[str]
    leituras: int
    primeiro: str
    ultimo: str
    serie: list[Ponto]


Metrica = Union[MetricaNumerica, MetricaCategorica]


class Planta(BaseModel):
    nome: str
    categoria: str
    descricao: str
    foco_semestre: str


class Canteiro(BaseModel):
    id: str
    nome: str


class Autor(BaseModel):
    nome: str
    formularios: int


class Periodo(BaseModel):
    inicio: str
    fim: str
    semanas: int
    total_formularios: int
    autores: list[Autor] = []


class ItemChecklist(BaseModel):
    item: str
    marcado: int
    total: int
    pct: float


class Observacao(BaseModel):
    data: str
    autor: str
    texto: str


class Lista(BaseModel):
    id: str
    nome: Optional[str] = None


class Fotos(BaseModel):
    total: int = 0


class Dossie(BaseModel):
    versao: str
    gerado_em: Optional[str] = None
    lista: Lista
    planta: Planta
    canteiro: Canteiro
    periodo: Periodo
    metricas: list[Metrica] = Field(default_factory=list)
    checklist: list[ItemChecklist] = Field(default_factory=list)
    observacoes: list[Observacao] = Field(default_factory=list)
    fotos: Fotos = Fotos()


class PedidoResumo(BaseModel):
    dossie: Dossie


class Secoes(BaseModel):
    """As quatro seções da documentação gerada."""
    introducao: str
    desenvolvimento: str
    cuidados: str
    conclusao: str


class RespostaResumo(BaseModel):
    secoes: Secoes
    modelo: str
    prompt_versao: str
    tokens_entrada: int
    tokens_saida: int
    duracao_ms: int
