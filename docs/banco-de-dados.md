# Banco de dados

PostgreSQL no **Neon**. Schema em [prisma/schema.prisma](../prisma/schema.prisma),
**16 tabelas** e 7 migrations aplicadas.

## Como as tabelas se ligam

```
PlantaForrageira ──< Canteiro ──< ListaDeFormularios ──< Formulario ──┬──< Checklist
   (60 espécies)       │              (o acompanhamento)   (1 semana)  ├──< Measurement
        │              │                     │                        └──< Photo
        │              │                     └──< Relatorio
        └──< PlantTemplate                        (o texto do aluno)
             (campos medidos por espécie)
                 ↑                                Institution ──< Turma ──< AlunoTurma >── User
    Checklist e Measurement                            └──< User ──< UserCanteiro >── Canteiro
    apontam para cá                                              └──< RefreshToken
                                                                 └──< ResumoIA (resumo da IA)
```

**A hierarquia tem três níveis:** um canteiro tem várias **listas**, e cada lista
tem vários **formulários**. `Formulario` **não** aponta para `Canteiro` — chega lá
pela lista. Já `Relatorio` tem `canteiro_id` direto (redundante com `list.canteiro_id`).

**`user_id` fica no formulário, não na lista.** Uma lista pode, pelo modelo, ter
formulários de vários alunos — é o caso de um canteiro compartilhado por uma turma.

## As tabelas

| tabela | o que guarda | chave |
|---|---|---|
| `User` | alunos, professores, admin (`role`) | `id` · `email` único |
| `Institution` | instituições de ensino | `id` |
| `AcademicPeriod` | períodos letivos (2026.1…) | `id` |
| `Turma` | turmas de um período | `id` |
| `AlunoTurma` | matrícula | **`(user_id, turma_id)`** |
| `PlantaForrageira` | catálogo de espécies, com descrição agronômica | `id` |
| `PlantTemplate` | os campos medidos de cada espécie | `id` · **único `(plant_id, field_name)`** |
| `Canteiro` | canteiro físico, de uma espécie | `id` |
| `UserCanteiro` | quem tem acesso a qual canteiro | **`(user_id, canteiro_id)`** |
| `ListaDeFormularios` | um acompanhamento (canteiro + espécie) | `id` |
| `Formulario` | uma visita de campo | `id` |
| `Measurement` | valor medido de um campo | `id` |
| `Checklist` | item conferido no formulário | `id` |
| `Photo` | foto do formulário | `id` |
| `Relatorio` | relatório acadêmico, 5 seções + nota | `id` |
| `ResumoIA` | documentação gerada pela IA | `id` |

Todos os `id` são `text` (UUID como string).

## Armadilhas do schema

### 1. Todas as FKs são `ON DELETE RESTRICT`

21 das 24. As exceções: `RefreshToken → User` e `ResumoIA` (ambas `CASCADE`) e
`institution_id` (`SET NULL`).

**Consequência:** o banco não apaga em cascata. Apagar um formulário exige remover
antes checklist, medições e fotos — é o que
[`deleteWithChildren()`](../src/repositories/formulario.repository.ts) faz em
transação. Vale a mesma ordem para qualquer limpeza manual.

### 2. Campos categóricos são guardados como número

`Measurement.value` é `double precision`, mas alguns campos são categóricos. Nesses,
o `unit` guarda as **opções** e o `value` guarda o **índice**:

```
field_name = "Estádio fenológico"
unit       = "vegetativo/elongação/florescimento"
value      = 2                 →  "florescimento"
```

Detectar isso pelo `/` no `unit` **não funciona**: `perfilhos/m²` tem barra e é
numérico. Por isso existe a coluna **`PlantTemplate.field_type`** (`NUMERICO` |
`CATEGORICO`) — 292 numéricos e 48 categóricos. Sempre use ela.

### 3. Nenhum "enum" é enum de verdade

`type`, `status`, `semester`, `category`, `role` e `field_type` são `text` livre,
sem `CHECK`. O banco aceita `status = 'banana'`. A restrição existe só como
comentário no schema e como validação no service.

### 4. Não há `@@unique(form_id, template_id)`

Dá para gravar a mesma medição duas vezes no mesmo formulário. Pior: o
`POST /formularios/:id/sync` usa `createMany({ skipDuplicates: true })`, que **só
funciona se existir uma unique constraint** — sem ela, sincronizar duas vezes
duplica tudo. O dossiê da IA se protege disso mantendo a leitura mais recente por
formulário, mas é remendo: a correção é uma migration.

### 5. `references` é palavra reservada do SQL

A coluna `Relatorio.references` quebra qualquer SQL cru sem aspas. O Prisma escapa
sozinho; scripts manuais precisam de `"references"`.

### 6. `Relatorio.submittedAt`, `grade` e `feedback` são `NOT NULL`

Um rascunho é obrigado a nascer com data de submissão. Deveriam ser nullable.

## Índices

27 índices. Antes da migration `20260913120000` existia **um só** no banco inteiro —
o Postgres não cria índice automático para FK. Foram adicionados em todas as chaves
estrangeiras que o dossiê e as listagens consultam.

## Migrations

| migration | o que fez |
|---|---|
| `20260422233522_user_institutuin` | vínculo usuário ↔ instituição |
| `20260524115735_full_schema` | schema completo |
| `20260524160000_add_user_avatar_url` | avatar |
| `20260524170000_drop_dead_aluno_table` | removeu a tabela `Aluno` (aluno é um `User`) |
| `20260524180000_alunoturma_composite_pk` | PK composta em `AlunoTurma` |
| `20260524190000_relatorio_rename_submited_at` | corrigiu o typo `submited_at` |
| `20260913120000_dossie_ia_dedupe_indices` | dedupe de templates, `field_type`, 21 índices, tabela `ResumoIA` |

> ⚠️ **Nunca rode `prisma migrate dev` apontando para o Neon.** Se ele detectar
> drift, oferece resetar o banco. Contra o Neon use sempre `npm run prisma:deploy`.

### Sobre a última migration

O seed usava `plantTemplate.create()` sem upsert, então cada execução duplicava os
340 templates — chegou a 680, e as medições ficaram espalhadas entre as cópias,
partindo a série temporal ao meio em 22 combinações. A migration reapontou as
medições, removeu as cópias e criou a unique. O [seed](../prisma/seed.ts) hoje usa
`upsert`.
