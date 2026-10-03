# Resumo por IA

A partir dos formulários de um acompanhamento, gera uma **documentação sobre o
cultivo e os cuidados da planta**, em quatro seções.

Roda **dentro do próprio Nest**, em [src/ai/](../src/ai/) — chama a Groq ou o
Gemini direto pela API REST deles, sem depender de um segundo serviço. Isso
permite publicar tudo num único projeto da Vercel, sem precisar hospedar nada
separado. (Existe também uma versão em Python do mesmo serviço, em
`ai-service/`, mantida só para quem quiser rodar/comparar localmente — ver
"Versão em Python" no fim deste documento.)

## Como funciona

```
1. Front  ──POST /api/canteiros/:id/resumo-ia──>  Nest
   (o usuário escolhe o canteiro; o Nest pega a lista mais recente dele que tem
   formulário. Quem já sabe a lista pode usar POST /api/listas-formularios/:id/resumo-ia)
2. Nest monta o DOSSIÊ: planta, período, métricas agregadas,
   checklist e observações                                  (~1.600 tokens)
3. Nest grava ResumoIA { status: PENDENTE, dossie } e devolve 202 NA HORA
4. Em segundo plano:  Nest (src/ai/) ──chama direto──> Groq ou Gemini
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

Há dois provedores de LLM: **Groq** e **Gemini**. `LLM_PROVIDER` escolhe o
padrão; é obrigatória só a chave do provedor em uso. Tudo fica no `.env` da
própria API (veja [.env.example](../.env.example)):

```env
LLM_PROVIDER=groq                    # groq | gemini
GROQ_API_KEY=gsk_...                 # https://console.groq.com/keys
GEMINI_API_KEY=                      # https://aistudio.google.com/apikey
```

Todo o resto tem default:

```env
GROQ_MODEL=openai/gpt-oss-120b       # GET /ai/modelos?provedor=groq lista os ids
GROQ_MAX_TOKENS=4000                 # ver "Limite da Groq" abaixo
GROQ_REASONING_EFFORT=low            # low | medium | high
GEMINI_MODEL=gemini-2.5-flash
GEMINI_MAX_TOKENS=8192
AI_TIMEOUT_MS=120000                 # quanto esperar a Groq/Gemini responder
```

O corpo do pedido de resumo aceita um provedor específico para forçar outro
numa chamada (mesma ideia do antigo `"provedor": "gemini"`), resolvido em
[obterProvedor](../src/ai/llm/index.ts).

## Rodar

Só um processo:

```bash
npm run dev
```

Não precisa mais subir nada em Python nem em outra porta.

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
  "prompt_versao": "1.1.0",
  "tokens_entrada": 1608, "tokens_saida": 742, "duracao_ms": 4310
}
```

## Arquivos

### Orquestração (fora de `src/ai/`)

| arquivo | papel |
|---|---|
| [dossie.service.ts](../src/services/dossie.service.ts) | monta o dossiê: agrega, traduz categóricos, valida o acesso |
| [dossie.repository.ts](../src/repositories/dossie.repository.ts) | as duas queries |
| [resumoia.service.ts](../src/services/resumoia.service.ts) | orquestra: cria o registro, dispara em segundo plano, grava o resultado |
| [resumo-ia.controller.ts](../src/modules/resumo-ia/resumo-ia.controller.ts) | os 6 endpoints |

### Geração por IA (`src/ai/`)

Mesma divisão em camadas que o `ai-service/` em Python tinha, só que em
TypeScript e dentro do próprio Nest:

| arquivo | papel |
|---|---|
| **[prompts/resumo.ts](../src/ai/prompts/resumo.ts)** | **o coração** — as regras do sistema e a formatação do dossiê |
| [services/gerador-resumo.service.ts](../src/ai/services/gerador-resumo.service.ts) | valida o dossiê, chama o LLM, confere as 4 seções |
| [llm/](../src/ai/llm/) | um arquivo por provedor (`groq.llm.ts`, `gemini.llm.ts`), mesma interface de [base.ts](../src/ai/llm/base.ts) |
| [schemas/dossie.ts](../src/ai/schemas/dossie.ts) | o contrato do dossiê e da resposta |
| [core/](../src/ai/core/) | config do `.env` e os erros de domínio |

## O dossiê

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
modelo.

## Adicionar outro provedor

1. Crie `src/ai/llm/<nome>.llm.ts` com uma subclasse de `ProvedorLLM`
   ([base.ts](../src/ai/llm/base.ts)): implemente `gerarJson` e `listarModelos`,
   chamando a API REST do provedor direto (sem precisar de SDK). Traduza os
   erros da API para `LimiteDeUso` / `FalhaNoModelo`.
2. Adicione a config dele em [core/config.ts](../src/ai/core/config.ts).
3. Registre em `PROVEDORES`, no [llm/index.ts](../src/ai/llm/index.ts).

O service e as rotas não mudam.

## Ajustar o texto gerado

Edite [src/ai/prompts/resumo.ts](../src/ai/prompts/resumo.ts) e **suba o
`PROMPT_VERSAO`** — ele é gravado em cada registro, então dá para comparar
saídas de versões diferentes.

**Prompt 1.1.0.** O princípio é: o modelo só redige; tudo que é conta ou
comparação é resolvido em TypeScript antes de chegar a ele.

- **Entrada pronta:** cada valor vai com a unidade da própria métrica, com vírgula
  decimal e data dd/mm/aaaa. As mudanças de estádio e as lacunas (checklist sem
  marcar, nenhuma foto) já vêm calculadas, cada lacuna com a sua `AÇÃO`.
- **Regras:** citar só números escritos no dossiê, na métrica certa; nunca
  calcular (nada de "+15 cm"); não afirmar causa que a observação não afirma;
  citar todas as métricas e todas as observações completas; recomendar só
  manejos com resultado relatado e as ações das lacunas.
- **Saída:** cada seção vem como lista de parágrafos, e
  [schemas/dossie.ts](../src/ai/schemas/dossie.ts) junta com linha em branco.
  O resto do Nest continua recebendo texto.

### Limite da Groq (plano gratuito)

São 8.000 tokens por minuto, contando a entrada (~3.700 com o prompt 1.1.0) **mais**
o `GROQ_MAX_TOKENS` reservado. Por isso:

- `GROQ_MAX_TOKENS` acima de ~4.300 faz toda chamada ser recusada (413).
- `GROQ_REASONING_EFFORT=low` é obrigatório: com `medium`, o raciocínio consome
  o teto e o JSON sai cortado. Em `low`, um resumo usa ~1.500 tokens em ~4 s.
- Dois resumos no mesmo minuto: a chamada pode ser recusada com 429 e o resumo
  fica em `ERRO`; nesse caso use o `/reprocessar`.

## Erros

| status | causa |
|---|---|
| `422` | versão de dossiê incompatível, ou dossiê vazio |
| `400` | `provedor` desconhecido |
| `429` | limite de uso do provedor |
| `502` | o provedor falhou, ou o modelo não devolveu o JSON esperado |
| `503` | chave do provedor (`GROQ_API_KEY` / `GEMINI_API_KEY`) não configurada |

A mensagem é repassada para o campo `erro` do registro — o front mostra em vez de
girar para sempre.

## Limitações conhecidas

**Vercel.** O processamento em segundo plano (`void this.processar(id)`)
precisa que a função siga executando depois do `202`. Em serverless ela pode
ser encerrada antes de terminar, deixando o resumo preso em `PROCESSANDO` —
daí existir o `/reprocessar`.

## Versão em Python (`ai-service/`)

Antes esse serviço rodava como um processo Python separado (FastAPI),
chamado pelo Nest via HTTP com um token compartilhado. Essa versão continua no
repositório, com a mesma estrutura em camadas (`routers/`, `services/`,
`llm/`, `prompts/`, `schemas/`, `core/`), útil para quem quiser rodar ou
comparar localmente — ver [ai-service/README.md](../ai-service/README.md).
Ela **não é usada em produção**: o fluxo real passa inteiro por
[src/ai/](../src/ai/), dentro do Nest.
