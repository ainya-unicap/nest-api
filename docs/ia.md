# Resumo por IA

A partir dos formulários de um acompanhamento, gera uma **documentação sobre o
cultivo e os cuidados da planta**, em quatro seções.

São **dois processos**: a API Nest e o serviço Python (`ai-service/`). O front
conversa só com o Nest.

## Como funciona

```
1. Front  ──POST /api/listas-formularios/:id/resumo-ia──>  Nest
2. Nest monta o DOSSIÊ: planta, período, métricas agregadas,
   checklist e observações                                  (~1.600 tokens)
3. Nest grava ResumoIA { status: PENDENTE, dossie } e devolve 202 NA HORA
4. Em segundo plano:  Nest ──POST /resumir──> ai-service ──> Groq (Llama)
5. Groq devolve JSON com as 4 seções
6. Nest grava { status: PRONTO, secoes, modelo, tokens, duracao_ms }
7. O front, que consultava GET /api/resumo-ia/:id, vê PRONTO e exibe
```

**Por que assíncrono:** a Vercel no plano Hobby corta a requisição em 10 s, e a
Groq leva mais que isso para um texto desse tamanho. O `202` sai em milissegundos
e o front faz polling.

**O modelo não faz conta e não vê o banco.** O dossiê chega com `min`, `max`,
`media` e `variacao_pct` já calculados no Nest — modelo de linguagem erra
aritmética. Ele só redige.

## Configurar

A **única** variável obrigatória:

```env
# ai-service/.env
GROQ_API_KEY=gsk_...          # https://console.groq.com/keys
```

Todo o resto tem default. Opcionais:

```env
GROQ_MODEL=llama-3.3-70b-versatile   # GET /modelos lista os ids disponíveis
INTERNAL_TOKEN=                      # segredo compartilhado com o Nest
GROQ_TEMPERATURE=0.3
GROQ_MAX_TOKENS=2000
```

E, no `.env` da API:

```env
AI_SERVICE_URL=http://localhost:8000
AI_INTERNAL_TOKEN=          # precisa ser igual ao INTERNAL_TOKEN do ai-service
AI_TIMEOUT_MS=120000
```

> Com `INTERNAL_TOKEN` vazio nos dois lados o serviço fica aberto — aceitável só
> em desenvolvimento local.

## Rodar

```bash
# terminal 1
cd ai-service
.venv/Scripts/activate        # Linux/Mac: source .venv/bin/activate
uvicorn main:app --reload --port 8000

# terminal 2
npm run dev
```

Conferir: `curl localhost:8000/health` → `"groq_key_configurada": true`.

## Endpoints

| método | rota | o que faz |
|---|---|---|
| `POST` | `/api/listas-formularios/:id/resumo-ia` | **dispara** · `202 {id, status:"PENDENTE"}` |
| `GET` | `/api/resumo-ia/:id` | **o polling** · status e resultado |
| `GET` | `/api/listas-formularios/:id/resumo-ia` | histórico de gerações |
| `POST` | `/api/resumo-ia/:id/reprocessar` | tenta de novo após erro ou travamento |

Acesso: Bearer + estar vinculado ao canteiro da lista.

### Os quatro estados

| status | significa |
|---|---|
| `PENDENTE` | registrado, ainda não começou |
| `PROCESSANDO` | chamando o modelo |
| `PRONTO` | `secoes` preenchido |
| `ERRO` | `erro` explica o motivo |

### Exemplo de resposta pronta

```json
{
  "id": "…", "status": "PRONTO",
  "secoes": {
    "introducao": "…", "desenvolvimento": "…",
    "cuidados": "…",   "conclusao": "…"
  },
  "modelo": "llama-3.3-70b-versatile",
  "prompt_versao": "1.0.0",
  "tokens_entrada": 1608, "tokens_saida": 742, "duracao_ms": 4310
}
```

## Arquivos

### API (Nest)

| arquivo | papel |
|---|---|
| [dossie.service.ts](../src/services/dossie.service.ts) | monta o dossiê: agrega, traduz categóricos, valida o acesso |
| [dossie.repository.ts](../src/repositories/dossie.repository.ts) | as duas queries |
| [resumoia.service.ts](../src/services/resumoia.service.ts) | orquestra: cria o registro, dispara em segundo plano, grava o resultado |
| [resumo-ia.controller.ts](../src/modules/resumo-ia/resumo-ia.controller.ts) | os 4 endpoints |

### Serviço Python (`ai-service/`)

| arquivo | papel |
|---|---|
| **[prompt.py](../ai-service/prompt.py)** | **o coração** — as regras do sistema e a formatação do dossiê |
| [main.py](../ai-service/main.py) | a API HTTP, JSON mode e tratamento de erro |
| [schemas.py](../ai-service/schemas.py) | o contrato com o Nest (Pydantic) |

## O dossiê

Contrato entre os dois serviços. Mudou de um lado, muda do outro — o campo
`versao` existe para detectar divergência (`422` se não bater).

```jsonc
{
  "versao": "1",
  "planta":   { "nome": "BRS Piatã", "categoria": "GRAMINEA_PORTE_MEDIO",
                "descricao": "Urochloa brizantha cv. …", "foco_semestre": "AMBOS" },
  "canteiro": { "id": "…", "nome": "Canteiro Demonstração — BRS Piatã" },
  "periodo":  { "inicio": "2026-03-14", "fim": "2026-05-30", "semanas": 12,
                "total_formularios": 12, "autores": [{ "nome": "…", "formularios": 12 }] },
  "metricas": [
    { "campo": "Altura da planta", "unidade": "cm", "tipo": "numerico",
      "primeiro": 8, "ultimo": 38, "min": 8, "max": 55, "media": 31.75,
      "variacao_pct": 375, "serie": [{ "data": "2026-03-14", "valor": 8 }, …] },
    { "campo": "Estádio fenológico", "tipo": "categorico",
      "opcoes": ["vegetativo", "elongação", "florescimento"],
      "serie": [{ "data": "2026-03-14", "valor": "vegetativo" }, …] }
  ],
  "checklist":   [{ "item": "Altura da planta", "marcado": 11, "total": 12, "pct": 91.7 }],
  "observacoes": [{ "data": "2026-04-11", "autor": "…", "texto": "Ataque de formigas…" }],
  "fotos": { "total": 0 }
}
```

Três cuidados embutidos no [dossie.service.ts](../src/services/dossie.service.ts):

1. **Agrupa por `field_name` + `unit`, nunca por `template_id`** — templates
   duplicados partiriam a série no meio.
2. **Traduz categóricos** usando `field_type` e as opções do `unit`. Sem isso a IA
   receberia "Estádio fenológico: 2".
3. **Um ponto por formulário** — sem `@@unique(form_id, template_id)` no banco, a
   mesma medição pode aparecer repetida; fica a leitura mais recente.

## Trocar de modelo

Só o `.env`. Se o id tiver mudado:

```bash
curl localhost:8000/modelos     # lista o que a sua chave enxerga
```

## Ajustar o texto gerado

Edite [ai-service/prompt.py](../ai-service/prompt.py) e **suba o `PROMPT_VERSAO`** —
ele é gravado em cada registro, então dá para comparar saídas de versões diferentes.

O prompt hoje exige: usar só o dossiê, não refazer as contas, sempre citar a
unidade, cruzar observação com métrica na mesma data, apontar lacunas em vez de
inventar, e responder só JSON.

## Erros

| status do `ai-service` | causa |
|---|---|
| `401` | `X-Internal-Token` errado |
| `422` | versão de dossiê incompatível, ou dossiê vazio |
| `429` | limite de uso da Groq |
| `502` | Groq falhou, ou o modelo não devolveu o JSON esperado |
| `503` | `GROQ_API_KEY` não configurada |

A mensagem é repassada para o campo `erro` do registro — o front mostra em vez de
girar para sempre.

## Limitações conhecidas

**Vercel.** O processamento em segundo plano funciona em servidor que fica de pé
(local, Render, Railway). Em serverless a função pode ser encerrada logo após o
`202`, deixando o resumo preso em `PROCESSANDO` — daí existir o `/reprocessar`. A
solução definitiva é o Python chamar um callback no Nest ao terminar.

**Ainda não validado com chave real.** Todo o encanamento foi testado ponta a
ponta (inclusive o caminho de erro), mas a chamada à Groq nunca foi executada.
Falta confirmar: o id do modelo, o JSON mode devolvendo as 4 chaves, e a qualidade
do texto.
