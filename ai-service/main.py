"""
Serviço de IA do DonkeyCode.

Recebe o dossiê montado pelo Nest e devolve a documentação em quatro seções,
gerada pelo LLM escolhido (Groq ou Gemini — ver llm/).

    uvicorn main:app --reload --port 8000

Não é exposto ao front: só o Nest chama, autenticado por um segredo compartilhado
no header X-Internal-Token.

Camadas:
    routers/   rotas HTTP, finas
    services/  regra de negócio
    llm/       um arquivo por provedor, todos com a mesma interface
    prompts/   texto enviado ao modelo
    schemas/   contrato com o Nest
    core/      config, segurança e erros
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from core.erros import ErroServico
from routers import resumo, sistema

app = FastAPI(title="DonkeyCode AI Service", version="1.1.0")


@app.exception_handler(ErroServico)
def tratar_erro_servico(_: Request, erro: ErroServico):
    # Mesmo formato do HTTPException: o Nest lê o campo `detail`.
    return JSONResponse(status_code=erro.status_http, content={"detail": erro.mensagem})


app.include_router(sistema.router)
app.include_router(resumo.router)
