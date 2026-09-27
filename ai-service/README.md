# ai-service — resumo por IA (Groq / Gemini)

Serviço Python que recebe o **dossiê** montado pela API Nest e devolve a
documentação sobre o cultivo da planta em quatro seções.

Não é exposto ao front: **só o Nest conversa com ele.**

## Como rodar

```bash
cd ai-service
python -m venv .venv
.venv/Scripts/activate          # Windows  (Linux/Mac: source .venv/bin/activate)
pip install -r requirements.txt

cp .env.example .env            # preencha a chave do provedor que for usar
uvicorn main:app --reload --port 8000
```

`LLM_PROVIDER` escolhe o provedor padrão (`groq` ou `gemini`). É obrigatória só a
chave dele:

- `GROQ_API_KEY` — https://console.groq.com/keys
- `GEMINI_API_KEY` — https://aistudio.google.com/apikey

Todo o resto tem default.

## Estrutura

```
ai-service/
├── main.py                 cria o app, registra rotas e o handler de erro
├── routers/
│   ├── sistema.py          GET /health, GET /modelos
│   └── resumo.py           POST /resumir
├── services/
│   └── resumo_service.py   valida o dossiê, chama o LLM, confere as 4 seções
├── llm/                    um arquivo por provedor, todos com a mesma interface
│   ├── base.py             ProvedorLLM (classe abstrata) e RespostaLLM
│   ├── groq_llm.py
│   ├── gemini_llm.py
│   └── __init__.py         registro PROVEDORES e obter_provedor()
├── prompts/
│   └── resumo.py           o prompt e a formatação do dossiê em texto
├── schemas/
│   └── dossie.py           o contrato com o Nest (Pydantic)
└── core/
    ├── config.py           tudo que vem do .env
    ├── seguranca.py        confere o X-Internal-Token
    └── erros.py            erros de domínio → status HTTP
```

O fluxo de uma chamada: `routers/resumo.py` → `services/resumo_service.py` →
`llm/<provedor>_llm.py`. O service não sabe qual SDK está por trás; os provedores
traduzem os erros do SDK para `LimiteDeUso` (429) ou `FalhaNoModelo` (502).

## Endpoints

| método | rota | para quê |
|---|---|---|
| `GET` | `/health` | provedor padrão, modelo e se cada chave está configurada |
| `GET` | `/modelos?provedor=groq` | lista os modelos que a chave enxerga — use para confirmar o id antes de trocar |
| `POST` | `/resumir` | recebe `{ "dossie": {...}, "provedor"?: "gemini" }` e devolve as seções |

Sem `provedor` no corpo, vale o `LLM_PROVIDER`.

## Trocar de modelo ou de provedor

Só mexer no `.env`:

```
LLM_PROVIDER=groq
GROQ_MODEL=openai/gpt-oss-120b
GEMINI_MODEL=gemini-2.5-flash
```

## Adicionar um provedor

1. `llm/<nome>_llm.py` com uma subclasse de `ProvedorLLM`.
2. A config dele em `core/config.py`.
3. Registrar em `PROVEDORES`, em `llm/__init__.py`.

## Prompt

`prompts/resumo.py` tem o prompt. `PROMPT_VERSAO` é gravada junto do resultado
no banco; suba a versão sempre que mudar as regras.

`schemas/dossie.py` espelha `src/services/dossie.service.ts`; o campo `versao`
existe para detectar divergência entre os dois lados.

## Códigos de erro

| status | significa |
|---|---|
| `400` | `provedor` desconhecido |
| `401` | `X-Internal-Token` errado |
| `422` | versão de dossiê incompatível, ou dossiê sem métricas e sem observações |
| `429` | limite de uso do provedor |
| `502` | o provedor falhou, ou o modelo não devolveu o JSON esperado |
| `503` | chave do provedor não configurada |

O Nest repassa essas mensagens para o campo `erro` do registro `ResumoIA`.
