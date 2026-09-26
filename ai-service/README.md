# ai-service — resumo por IA (Groq)

Serviço Python que recebe o **dossiê** montado pela API Nest e devolve a
documentação sobre o cultivo da planta em quatro seções.

Não é exposto ao front: **só o Nest conversa com ele.**

## Como rodar

```bash
cd ai-service
python -m venv .venv
.venv/Scripts/activate          # Windows  (Linux/Mac: source .venv/bin/activate)
pip install -r requirements.txt

cp .env.example .env            # preencha GROQ_API_KEY
uvicorn main:app --reload --port 8000
```

A **única** variável obrigatória é `GROQ_API_KEY` (https://console.groq.com/keys).
Todo o resto tem default.

## Endpoints

| método | rota | para quê |
|---|---|---|
| `GET` | `/health` | diz se a chave e o token estão configurados e qual modelo está em uso |
| `GET` | `/modelos` | lista os modelos que a sua chave enxerga — use para confirmar o id antes de trocar |
| `POST` | `/resumir` | recebe `{ "dossie": {...} }` e devolve as seções |

## Trocar de modelo

Só mexer no `.env`:

```
GROQ_MODEL=llama-3.3-70b-versatile
```

Se o id mudar, `GET /modelos` mostra os disponíveis. Nenhuma alteração de código
é necessária.

## Arquivos

- `main.py` — a API HTTP: valida o token interno, chama a Groq em JSON mode, trata erro.
- `prompt.py` — o prompt e a formatação do dossiê em texto. `PROMPT_VERSAO` é gravada
  junto do resultado no banco; suba a versão sempre que mudar as regras.
- `schemas.py` — o contrato com o Nest (Pydantic). Espelha `src/services/dossie.service.ts`;
  o campo `versao` existe para detectar divergência entre os dois lados.

## Códigos de erro

| status | significa |
|---|---|
| `401` | `X-Internal-Token` errado |
| `422` | versão de dossiê incompatível, ou dossiê sem métricas e sem observações |
| `429` | limite de uso da Groq |
| `502` | a Groq falhou, ou o modelo não devolveu o JSON esperado |
| `503` | `GROQ_API_KEY` não configurada |

O Nest repassa essas mensagens para o campo `erro` do registro `ResumoIA`.
