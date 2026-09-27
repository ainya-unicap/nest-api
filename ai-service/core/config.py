"""
Configuração lida do .env num lugar só. Os módulos importam `config`, nunca
chamam os.getenv direto — assim dá para ver tudo que o serviço usa aqui.
"""
import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class ConfigProvedor:
    api_key: str
    modelo: str
    temperatura: float
    max_tokens: int
    # Só para modelos que raciocinam antes de responder: "low" | "medium" | "high".
    # Vazio = padrão do provedor.
    esforco_raciocinio: str = ""


@dataclass(frozen=True)
class Config:
    # Provedor usado quando o pedido não diz qual: "groq" ou "gemini".
    provedor_padrao: str
    internal_token: str
    groq: ConfigProvedor
    gemini: ConfigProvedor


config = Config(
    provedor_padrao=os.getenv("LLM_PROVIDER", "groq").strip().lower(),
    internal_token=os.getenv("INTERNAL_TOKEN", ""),
    groq=ConfigProvedor(
        api_key=os.getenv("GROQ_API_KEY", ""),
        # GET /modelos?provedor=groq lista o que a chave enxerga.
        modelo=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
        temperatura=float(os.getenv("GROQ_TEMPERATURE", "0.3")),
        # O gpt-oss raciocina antes de responder, e esse raciocínio conta aqui.
        # No plano gratuito a Groq limita 8000 tokens/minuto contando a entrada
        # (~3700 com este prompt) MAIS este teto: acima de ~4300 a chamada é recusada (413).
        max_tokens=int(os.getenv("GROQ_MAX_TOKENS", "4000")),
        esforco_raciocinio=os.getenv("GROQ_REASONING_EFFORT", "low"),
    ),
    gemini=ConfigProvedor(
        api_key=os.getenv("GEMINI_API_KEY", ""),
        modelo=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        temperatura=float(os.getenv("GEMINI_TEMPERATURE", "0.3")),
        # Nos modelos 2.5 o "raciocínio" também consome esse limite; com pouco,
        # a resposta vem cortada no meio do JSON.
        max_tokens=int(os.getenv("GEMINI_MAX_TOKENS", "8192")),
    ),
)
