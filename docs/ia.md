# Resumo por IA

A partir dos formulários de um acompanhamento, gera uma **documentação sobre o
cultivo e os cuidados da planta**, em quatro seções.

São **dois processos**: a API Nest e o serviço Python (`ai-service/`). O front
conversa só com o Nest.

## Como funciona

```
1. Front  ──POST /api/canteiros/:id/resumo-ia──>  Nest
   (o usuário escolhe o canteiro; o Nest pega a lista mais recente dele que tem
   formulário. Quem já sabe a lista pode usar POST /api/listas-formularios/:id/resumo-ia)
2. Nest monta o DOSSIÊ: planta, período, métricas agregadas,
   checklist e observações                                  (~1.600 tokens)
3. Nest grava ResumoIA { status: PENDENTE, dossie } e devolve 202 NA HORA
4. Em segundo plano:  Nest ──POST /resumir──> ai-service ──> Groq ou Gemini
5. O LLM devolve JSON com as 4 seções
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

Há dois provedores de LLM: **Groq** e **Gemini**. O `LLM_PROVIDER` escolhe o
padrão; é obrigatória só a chave do provedor em uso.

```env
# ai-service/.env
LLM_PROVIDER=groq                    # groq | gemini
GROQ_API_KEY=gsk_...                 # https://console.groq.com/keys
GEMINI_API_KEY=                      # https://aistudio.google.com/apikey
```

Todo o resto tem default (veja [ai-service/.env.example](../ai-service/.env.example)):

```env
GROQ_MODEL=openai/gpt-oss-120b       # GET /modelos?provedor=groq lista os ids
GROQ_MAX_TOKENS=4000                 # ver "Limite da Groq" abaixo
GROQ_REASONING_EFFORT=low            # low | medium | high
GEMINI_MODEL=gemini-2.5-flash        # GET /modelos?provedor=gemini
GEMINI_MAX_TOKENS=8192
INTERNAL_TOKEN=                      # segredo compartilhado com o Nest
```

O corpo do `/resumir` aceita `"provedor": "gemini"` para forçar outro provedor
numa chamada específica.

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

Conferir: `curl localhost:8000/health` → `provedores.groq.chave_configurada: true`.

## Endpoints

| método | rota | o que faz |
|---|---|---|
| `POST` | `/api/canteiros/:id/resumo-ia` | **dispara pelo canteiro** · `202 {id, status, list_id, canteiro_id}` |
| `GET` | `/api/canteiros/:id/resumo-ia` | histórico do canteiro, todas as listas |
| `POST` | `/api/listas-formularios/:id/resumo-ia` | **dispara pela lista** · `202 {id, status:"PENDENTE"}` |
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
  "provedor": "groq", "modelo": "openai/gpt-oss-120b",
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
| [resumo-ia.controller.ts](../src/modules/resumo-ia/resumo-ia.controller.ts) | os 6 endpoints |

### Serviço Python (`ai-service/`)

| arquivo | papel |
|---|---|
| **[prompts/resumo.py](../ai-service/prompts/resumo.py)** | **o coração** — as regras do sistema e a formatação do dossiê |
| [main.py](../ai-service/main.py) | cria o app, registra as rotas e o tratamento de erro |
| [routers/](../ai-service/routers/) | as rotas HTTP (`/health`, `/modelos`, `/resumir`) |
| [services/resumo_service.py](../ai-service/services/resumo_service.py) | valida o dossiê, chama o LLM, confere as 4 seções |
| [llm/](../ai-service/llm/) | um arquivo por provedor (`groq_llm.py`, `gemini_llm.py`), mesma interface de [base.py](../ai-service/llm/base.py) |
| [schemas/dossie.py](../ai-service/schemas/dossie.py) | o contrato com o Nest (Pydantic) |
| [core/](../ai-service/core/) | config do `.env`, token interno e erros |

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

Só o `.env`: `LLM_PROVIDER` troca o provedor, `GROQ_MODEL` / `GEMINI_MODEL` o
modelo. Se o id tiver mudado:

```bash
curl "localhost:8000/modelos?provedor=groq"     # lista o que a sua chave enxerga
curl "localhost:8000/modelos?provedor=gemini"
```

## Adicionar outro provedor

1. Crie `ai-service/llm/<nome>_llm.py` com uma subclasse de `ProvedorLLM`
   ([base.py](../ai-service/llm/base.py)): `_criar_cliente`, `gerar_json` e
   `listar_modelos`. Traduza os erros do SDK para `LimiteDeUso` / `FalhaNoModelo`.
2. Adicione a config dele em [core/config.py](../ai-service/core/config.py).
3. Registre em `PROVEDORES`, no [llm/\_\_init\_\_.py](../ai-service/llm/__init__.py).

O service e as rotas não mudam.

## Ajustar o texto gerado

Edite [ai-service/prompts/resumo.py](../ai-service/prompts/resumo.py) e **suba o `PROMPT_VERSAO`** —
ele é gravado em cada registro, então dá para comparar saídas de versões diferentes.

**Prompt 1.1.0.** O princípio é: o modelo só redige; tudo que é conta ou
comparação é resolvido em Python antes de chegar a ele.

- **Entrada pronta:** cada valor vai com a unidade da própria métrica, com vírgula
  decimal e data dd/mm/aaaa. As mudanças de estádio e as lacunas (checklist sem
  marcar, nenhuma foto) já vêm calculadas, cada lacuna com a sua `AÇÃO`.
- **Regras:** citar só números escritos no dossiê, na métrica certa; nunca
  calcular (nada de "+15 cm"); não afirmar causa que a observação não afirma;
  citar todas as métricas e todas as observações completas; recomendar só
  manejos com resultado relatado e as ações das lacunas.
- **Saída:** cada seção vem como lista de parágrafos, e o `schemas/dossie.py` junta
  com linha em branco. O Nest continua recebendo texto.

A versão 1.0.0 trocava valores entre métricas (citou a altura como comprimento do
entrenó), fazia contas próprias e omitia métricas inteiras.

### Limite da Groq (plano gratuito)

São 8.000 tokens por minuto, contando a entrada (~3.700 com o prompt 1.1.0) **mais**
o `GROQ_MAX_TOKENS` reservado. Por isso:

- `GROQ_MAX_TOKENS` acima de ~4.300 faz toda chamada ser recusada (413).
- `GROQ_REASONING_EFFORT=low` é obrigatório: com `medium`, o raciocínio consome
  o teto e o JSON sai cortado. Em `low`, um resumo usa ~1.500 tokens em ~4 s.
- Dois resumos no mesmo minuto: o SDK espera e tenta de novo, mas pode desistir
  com 429 e o resumo fica em `ERRO`; nesse caso use o
  `/reprocessar`.

## Erros

| status do `ai-service` | causa |
|---|---|
| `401` | `X-Internal-Token` errado |
| `422` | versão de dossiê incompatível, ou dossiê vazio |
| `400` | `provedor` desconhecido |
| `429` | limite de uso do provedor |
| `502` | o provedor falhou, ou o modelo não devolveu o JSON esperado |
| `503` | chave do provedor (`GROQ_API_KEY` / `GEMINI_API_KEY`) não configurada |

A mensagem é repassada para o campo `erro` do registro — o front mostra em vez de
girar para sempre.

## Limitações conhecidas

**Vercel.** O processamento em segundo plano funciona em servidor que fica de pé
(local, Render, Railway). Em serverless a função pode ser encerrada logo após o
`202`, deixando o resumo preso em `PROCESSANDO` — daí existir o `/reprocessar`. A
solução definitiva é o Python chamar um callback no Nest ao terminar.

**Groq validada com chave real, direto no ai-service** (dossiê sintético): o
`openai/gpt-oss-120b` devolveu as 4 seções em ~2,5 s. O `llama-3.3-70b-versatile`,
padrão anterior, não está mais disponível. Ainda falta rodar o fluxo completo pelo
Nest e validar o **Gemini**, que ainda não teve chave configurada.
