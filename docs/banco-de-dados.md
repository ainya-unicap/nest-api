# Banco de dados

PostgreSQL no **Neon**. Schema em [prisma/schema.prisma](../prisma/schema.prisma),
**13 tabelas** — veja em `prisma/migrations/` o histórico de mudanças.

## Como as tabelas se ligam

```
PlantaForrageira ──< Canteiro ──< ListaDeFormularios ──< Formulario ──< Photo
   (15 espécies)       │              (o acompanhamento)   (altura, clima,
                       │                     │              estádio, checklist
                       │                     └──< Relatorio  fixo, observações)
                       │
                       Institution ──< Turma ──< AlunoTurma >── User
                                           └──< User ──< UserCanteiro >── Canteiro
                                                     └──< RefreshToken
                                                     └──< ResumoIA (legado, sem uso)
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
| `PlantaForrageira` | catálogo de 15 espécies, com descrição agronômica | `id` |
| `Canteiro` | canteiro físico, de uma espécie | `id` |
| `UserCanteiro` | quem tem acesso a qual canteiro | **`(user_id, canteiro_id)`** |
| `ListaDeFormularios` | um acompanhamento (canteiro + espécie) | `id` |
| `Formulario` | uma visita de campo — título, data, semana, clima, altura estimada, estádio fenológico, checklist fixo (5 itens) e observações | `id` |
| `Photo` | foto do formulário (até 5 por formulário) | `id` |
| `Relatorio` | relatório acadêmico, 5 seções + nota | `id` |
| `ResumoIA` | **legado** — tabela do antigo resumo por IA (código removido), sem uso hoje | `id` |

Todos os `id` são `text` (UUID como string).

## Armadilhas do schema

### 1. Quase todas as FKs são `ON DELETE RESTRICT`

As exceções: `RefreshToken → User` e `ResumoIA` (ambas `CASCADE`) e
`institution_id` (`SET NULL`). O resto é `RESTRICT` — confira o
[schema.prisma](../prisma/schema.prisma) para a lista exata.

**Consequência:** o banco não apaga em cascata. Apagar um formulário exige
remover antes as fotos — é o que
[`deleteWithChildren()`](../src/repositories/formulario.repository.ts) faz em
transação. Vale a mesma ordem para qualquer limpeza manual: filhos antes do pai.

### 2. Nenhum "enum" é enum de verdade

`type`, `weather`, `phenological_stage`, `status`, `semester`, `category` e
`role` são `text` livre, sem `CHECK`. O banco aceita `status = 'banana'`. A
restrição existe só como comentário no schema e como validação no service
(`formulario.service.ts` valida `weather`/`phenological_stage` contra uma
lista fixa, por exemplo).

### 3. `references` é palavra reservada do SQL

A coluna `Relatorio.references` quebra qualquer SQL cru sem aspas. O Prisma escapa
sozinho; scripts manuais precisam de `"references"`.

### 4. `Relatorio.submittedAt`, `grade` e `feedback` são `NOT NULL`

Um rascunho é obrigado a nascer com data de submissão. Deveriam ser nullable.

### 5. `ResumoIA` é tabela morta

Era usada pelo antigo resumo por IA (removido). Nenhum código grava ou lê dela
hoje — fica no banco até alguém decidir dropar numa migration própria.

## Migrations

| migration | o que fez |
|---|---|
| `20260422233522_user_institutuin` | vínculo usuário ↔ instituição |
| `20260524115735_full_schema` | schema completo |
| `20260524160000_add_user_avatar_url` | avatar |
| `20260524170000_drop_dead_aluno_table` | removeu a tabela `Aluno` (aluno é um `User`) |
| `20260524180000_alunoturma_composite_pk` | PK composta em `AlunoTurma` |
| `20260524190000_relatorio_rename_submited_at` | corrigiu o typo `submited_at` |
| `20260913120000_dossie_ia_dedupe_indices` | dedupe de templates, `field_type`, índices, tabela `ResumoIA` (histórico — essas tabelas não existem mais) |
| `20261003210549_add_formulario_week` | campo `week` (1 a 12) no formulário |
| `20261025003615_redesign_formulario` | apaga formulários antigos e troca `started_at`/`ended_at` pelos campos fixos (`title`, `date`, `weather`, `estimated_height_cm`, `phenological_stage`, checklist de 5 itens) |
| `20261025005409_remove_plant_template_checklist_measurement` | remove as tabelas `Checklist`, `Measurement` e `PlantTemplate` |
| `20261025013800_reduzir_catalogo_plantas_para_15` | reduz o catálogo de 60 para 15 espécies, apagando em cascata canteiros que usavam uma planta removida |

> ⚠️ **Nunca rode `prisma migrate dev` apontando para o Neon.** Se ele detectar
> drift, oferece resetar o banco. Contra o Neon use sempre `npm run prisma:deploy`.
