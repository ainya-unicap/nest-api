# API — referência

Base: `http://localhost:3000/api` · Swagger: `/api/docs` · spec: `/api/docs.json`

**70 rotas.** O Swagger é a fonte viva — este documento é o mapa geral.

## Autenticação

JWT via `Authorization: Bearer <accessToken>`. **Tudo é protegido por padrão.**

As **5 rotas públicas**:

```
POST /api/users            cadastro
POST /api/users/login      login
POST /api/users/refresh    renova o par de tokens
POST /api/users/logout     revoga o refresh token
GET  /api/institutions     listagem (a tela de cadastro precisa antes do login)
POST /api/professores      cadastro de professora (portal separado)
```

`login` e `refresh` devolvem `role` (`aluno`/`professor`/`admin`) junto com os
tokens — o app do aluno deve bloquear o acesso se `role !== 'aluno'`.

| token | validade | onde fica |
|---|---|---|
| `accessToken` | 15 min | só no cliente |
| `refreshToken` | 7 dias | tabela `RefreshToken`, rotacionado a cada uso |

O login tem **rate limit: 10 tentativas por IP a cada 15 minutos** → `429`.

## Formato de erro

```json
{
  "error": "user_id: obrigatório; week: deve ser um número inteiro entre 1 e 12 (recebido: 99)",
  "codigo": "FORMULARIO_INVALIDO",
  "campos": {
    "user_id": "obrigatório",
    "week": "deve ser um número inteiro entre 1 e 12 (recebido: 99)"
  }
}
```

- **`error`** — sempre presente. Mensagem legível, pronta para exibir.
- **`codigo`** — identificador estável; trate por ele, não pelo texto.
- **`campos`** — só em erro de validação. Chave = nome do campo, valor = o
  problema dele. Serve para destacar o input errado no formulário.

A validação **acumula**: o cliente recebe tudo que está errado de uma vez, em vez
de descobrir um problema por tentativa.

### Códigos

| código | status | significa |
|---|---|---|
| `FORMULARIO_INVALIDO` | 400 | campo obrigatório ausente ou valor fora do aceito |
| `VALIDACAO` | 400 | validação genérica |
| `REFERENCIA_INEXISTENTE` | 400 | um id enviado não existe no banco — `campos` diz qual |
| `VALOR_INVALIDO` / `CAMPO_DESCONHECIDO` | 400 | o banco recusou o valor ou o campo |
| `DUPLICADO` | 409 | violaria uma constraint de unicidade |
| `NAO_ENCONTRADO` | 404 | o registro não existe |
| `BANCO_INDISPONIVEL` / `BANCO_TIMEOUT` | 503 | o Postgres não respondeu |
| `ERRO_INTERNO` | 500 | não identificado — **veja o log do servidor** |

> Erros do Prisma são traduzidos antes de sair. Um `list_id` inexistente devolve
> `400 REFERENCIA_INEXISTENTE` nomeando o campo, e não um `500` genérico.

### Status

| status | quando |
|---|---|
| `400` | falta campo obrigatório, valor inválido, ou operação inválida para o estado atual |
| `401` | token ausente, vazio ou inválido |
| `403` | autenticado, mas o recurso é de outra pessoa / outro canteiro |
| `404` | não existe |
| `409` | conflito com um registro já existente |
| `422` | existe, mas não tem dados suficientes (ex.: lista sem formulários) |
| `429` | rate limit do login |
| `503` | banco de dados indisponível |
| `500` | erro inesperado |

### Onde olhar quando não entender o erro

**Todo erro é registrado no servidor**, inclusive os 4xx — com método, rota,
status, código, mensagem e o corpo enviado (campos sensíveis mascarados):

```
WARN [HttpErrorFilter] POST /api/formularios -> 400 REFERENCIA_INEXISTENTE
  | list_id aponta para um registro que não existe
  | body: {"list_id":"nao-existe-123","user_id":"demo-user-ia","type":"SEMANAL"}
```

## Regra de acesso aos canteiros

Vale para dossiê e resumo por IA: **basta estar vinculado ao canteiro**
(`UserCanteiro`). Se só uma pessoa está vinculada, só ela passa; se há várias,
todas passam e o dossiê considera os formulários de todo mundo.

---

## Endpoints por grupo

### Auth · Users · Institutions

| método | rota | |
|---|---|---|
| `POST` | `/users/login` · `/refresh` · `/logout` | público |
| `POST` | `/users` | público — cadastro |
| `GET` | `/users` · `/users/:id` | |
| `PUT` | `/users/:id/profile` | nome e/ou senha |
| `GET` | `/institutions` | público |
| `POST` `GET` | `/institutions` · `/institutions/:id` | |

### Alunos

| método | rota | |
|---|---|---|
| `GET` | `/alunos/:id/resumo` | `{total_formularios, total_semanas, total_relatorios}` |
| `GET` | `/alunos/:userId/home` | recentes + canteiros + totais |

### Canteiros · UserCanteiros · Listas

| método | rota | |
|---|---|---|
| `GET` | `/canteiros?userId=` · `/canteiros/user/:userId` | devolve **canteiros**, não vínculos |
| `POST` | `/canteiros` | com `user_id` no corpo, já cria o vínculo |
| `GET` | `/canteiros/:id/listas` | |
| `GET` | `/canteiros/:id/formularios` | todos os formulários do canteiro, organizados por lista (sem IA) |
| `POST` `DELETE` | `/user-canteiros` | ids no corpo |
| `GET` | `/user-canteiros/user/:userId` · `/user-canteiros/canteiro/:canteiro_id` | |
| `POST` | `/listas-formularios` | |
| `GET` | `/listas-formularios/:id` · `/:id/formularios` · `/canteiro/:canteiroId` | |

### Formulários

Campos fixos, iguais para qualquer planta: `title`, `date`, `week` (1-12),
`weather` (SOL/NUBLADO/CHUVA), `estimated_height_cm`, `phenological_stage`
(VEGETATIVO/ELONGACAO/FLORESCIMENTO), os 5 booleans de checklist
(`checklist_irrigacao`, `checklist_capina`, `checklist_adubacao`,
`checklist_plantio`, `checklist_pragas`) e `observations`.

Obrigatórios na criação: `list_id`, `user_id`, `type`, `title` e `weather`.
`estimated_height_cm` e `phenological_stage` são **opcionais** (como no app):
ausentes, `null` ou `""` gravam em branco; preenchidos, seguem validados. No
`PUT`/`PATCH`, enviar `null` ou `""` nesses dois campos limpa o valor gravado —
omitir não altera.

| método | rota | |
|---|---|---|
| `GET` | `/formularios` · `/formularios/user/:userId` | id do usuário por path, query ou token |
| `GET` | `/formularios/:id` | inclui lista, planta, canteiro, fotos |
| `POST` | `/formularios` | `date` preenchida com a hora atual se omitida |
| `PUT` `PATCH` | `/formularios/:id` | checklist parcial só altera os campos enviados |
| `DELETE` | `/formularios/:id` | **só o dono**; fotos removidas em transação |
| `GET` | `/formularios/:id/photos` | |
| `POST` `PATCH` | `/formularios/:id/finalizar` | grava `synced` |
| `POST` | `/formularios/:id/sync` | preenchimento offline, respeita o limite de 5 fotos |

### Photos

| método | rota | |
|---|---|---|
| `POST` | `/photos` | registra uma foto já hospedada (`form_id` + `url`) |
| `GET` `POST` | `/photos/form/:formId` · `/photos/formulario/:formularioId` | aliases |
| `POST` | `/photos/upload` | **multipart** — JPEG/PNG/WEBP até 5 MB, limite de 5 fotos por formulário |
| `DELETE` | `/photos/:id` | |
| `DELETE` | `/photos/:id` | |

### Relatórios

| método | rota | |
|---|---|---|
| `GET` | `/relatorios/user/:userId` · `/relatorios/:id` | |
| `POST` | `/relatorios/generate` | exige vínculo com o canteiro; nasce `RASCUNHO` |
| `PUT` | `/relatorios/:id/objective` · `/introduction` · `/development` · `/final-thoughts` · `/references` | |
| `PUT` | `/relatorios/:id` | várias seções de uma vez |
| `POST` | `/relatorios/:id/submit` | → `SUBMETIDO` |
| `DELETE` | `/relatorios/:id` | só em `RASCUNHO` |
| `GET` | `/relatorios/:id/export-pdf` | devolve o PDF |

**Regras:** só o dono altera; `SUBMETIDO`/`CORRIGIDO` não pode ser editado nem
apagado. O dono vem sempre do token.

### Turmas (lado do aluno)

O aluno nunca cria turma nem escolhe o id diretamente — só entra com o
**código** que a professora repassou (fluxo tipo "entrar numa chamada").

| método | rota | |
|---|---|---|
| `GET` | `/turmas/minhas` | turmas do aluno; cada uma já vem com `entrega` (ver abaixo) se houver |
| `POST` | `/turmas/entrar` | `{ code }` → vincula à turma. `404 CODIGO_INVALIDO` / `409 JA_VINCULADO` |
| `POST` | `/turmas/:id/relatorios` | multipart, campo `file` — PDF de qualquer origem, até 10 páginas. Reenviar substitui a entrega anterior |
| `DELETE` | `/turmas/:id/relatorios` | cancela a entrega, só até 24h do envio (`400 PRAZO_CANCELAMENTO_EXPIRADO`) |

`entrega` em `/turmas/minhas`: `{ id, fileName, fileUrl, submittedAt, podeCancelar } | null`.

Removidos: `PUT /users/:id/turma` e `POST`/`DELETE /aluno-turma` — vincular
aluno a turma sem o código não existe mais. `GET /academic-periods` segue
igual, sem mudanças.

### Portal Professor (`/professores`, tag Swagger "Portal Professor")

Pensado pra um site separado do app do aluno, mesma API. Exige
`role: professor` (`403` senão) em tudo que não for o cadastro.

| método | rota | |
|---|---|---|
| `POST` | `/professores` | público — cadastro (nome, e-mail, senha, confirmar) |
| `POST` `GET` | `/professores/turmas` | criar / listar as próprias turmas |
| `DELETE` | `/professores/turmas/:id` | cascata: vínculos, códigos e entregas somem; canteiros só perdem a etiqueta |
| `POST` `GET` | `/professores/turmas/:id/codigos` | gerar / listar códigos (vários podem coexistir) |
| `DELETE` | `/professores/turmas/:id/codigos/:codigoId` | apaga um código específico |
| `GET` | `/professores/turmas/:id/entregas` | PDFs entregues pelos alunos — sem nota/feedback por enquanto |

### Dossiê

| método | rota | |
|---|---|---|
| `GET` | `/listas-formularios/:id/dossie` | consolidado da lista: métricas, checklist e observações agregados |

---

## Rotas do projeto original que ainda faltam

Comparado ao back-end em Express que originou este projeto:

```
GET    /health
GET    /plantas-forrageiras          (grupo inteiro: 5 rotas)
POST   /formularios/:id/photos       (upload de foto do formulário — hoje é POST /photos/upload)
GET    /academic-periods/active
GET    /aluno-turma/user/:userId
PUT    /institutions/:id  ·  DELETE /institutions/:id
aliases em PT: /canteiros/usuario/:userId, /relatorios/usuario/:userId,
               PATCH /relatorios/:id/objetivo
```
