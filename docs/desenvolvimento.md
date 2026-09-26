# Desenvolvimento

## Primeira execução

```bash
npm install
cp .env.example .env        # preencha DATABASE_URL e JWT_SECRET
npm run prisma:generate     # o Prisma Client não vem no git
npm run dev
```

Sem `JWT_SECRET` a aplicação **não sobe** — é proposital: um segredo padrão em
produção deixaria qualquer um forjar token.

## Scripts

| comando | faz |
|---|---|
| `npm run dev` | `nest start --watch` |
| `npm run build` | compila para `dist/` |
| `npm start` | roda o build |
| `npm run prisma:generate` | gera o Prisma Client |
| `npm run prisma:deploy` | aplica migrations pendentes — **seguro no Neon** |
| `npm run prisma:migrate` | cria e aplica migration — **só em banco local** |
| `npm run prisma:seed` | plantas, templates e períodos |
| `npx tsx prisma/seed-demo.ts` | acompanhamento de demonstração |
| `node scripts/limpar-dados-teste.cjs` | remove dados de teste |

## Banco de dados

O `DATABASE_URL` aponta para o **Neon compartilhado** — rodar local mexe no banco
que todo mundo usa. Vale combinar antes de qualquer operação destrutiva.

### Criar uma migration

Como não há Postgres local configurado, o caminho seguro é **escrever o SQL à mão**:

1. Edite `prisma/schema.prisma`.
2. Crie `prisma/migrations/<AAAAMMDDHHMMSS>_nome/migration.sql` com o SQL.
3. `npm run prisma:deploy`
4. `npm run prisma:generate`
5. Confirme: `npx prisma migrate status` → *"Database schema is up to date!"*

> ⚠️ **Nunca `prisma migrate dev` contra o Neon.** Se detectar drift, ele oferece
> **resetar o banco**. O `deploy` nunca reseta.

Convenções a seguir (as migrations existentes usam): `TIMESTAMP(3)`, nomes de
índice `Tabela_coluna_idx` e de unique `Tabela_coluna_key`, tudo com aspas duplas.

### Seeds

**Principal** (`npm run prisma:seed`) — 60 plantas forrageiras, 340 templates de
medição, instituição e períodos letivos. Idempotente: usa `upsert`.

**Demonstração** (`npx tsx prisma/seed-demo.ts`) — cria a conta abaixo e um
acompanhamento completo de BRS Piatã: 12 formulários semanais, 72 medições, 36
checklists e observações realistas, com uma história (crescimento → ataque de
formigas → estiagem → corte na semana 9 → rebrota). É o que dá substância ao
resumo por IA.

```
demo@donkeycode.com / Demo@2026
```

Idempotente (ids fixos com `upsert`) e tudo prefixado com `demo-`. Para usar outra
conta: `DEMO_EMAIL=... DEMO_SENHA=... npx tsx prisma/seed-demo.ts`.

### Limpeza de dados de teste

```bash
node scripts/limpar-dados-teste.cjs              # preview, não altera nada
node scripts/limpar-dados-teste.cjs --executar   # aplica, em transação
```

Remove usuários/instituições/canteiros sintéticos e tudo que depende deles, **na
ordem que as FKs `RESTRICT` exigem**. A lista `MANTER_EMAILS` no topo do arquivo
protege as contas reais — revise antes de rodar.

## Serviço de IA

Processo separado; `npm run dev` **não** sobe. Veja [ia.md](ia.md).

```bash
cd ai-service
python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env          # preencha GROQ_API_KEY
uvicorn main:app --reload --port 8000
```

## Convenções de código

- **Camadas:** controller → service → repository. Regra de negócio só no service.
- **Erros:** `throw new HttpError('mensagem', 404)`. O filtro global converte.
- **Rotas novas nascem protegidas.** Abrir exige `@Public()` explícito.
- **Aliases de rota** vão num decorator só: `@Get(['a', 'b'])`. Empilhar `@Get`
  duas vezes registra apenas uma.
- **Dono vem do token** (`req.user.id`), nunca do corpo.
- **Todo endpoint novo** ganha `@ApiTags`, `@ApiOperation` e o schema de resposta.

## Problemas comuns

| sintoma | causa |
|---|---|
| `Cannot find module '@prisma/client'` | falta `npm run prisma:generate` |
| `JWT_SECRET não configurado` | falta a variável no `.env` |
| Requisições penduram para sempre | o Neon caiu com o servidor no ar; **reinicie o processo** (o pool fica envenenado) |
| Uma rota some sem erro | dois decorators do mesmo verbo empilhados |
| DI vem `undefined` | executando com `tsx`/esbuild, que não emite `emitDecoratorMetadata` — use `npm run dev` |
| `DELETE` devolve 500 | FK `RESTRICT`: apague os filhos antes, em transação |
| `syntax error at or near "references"` | palavra reservada; use `"references"` no SQL cru |
| `ai-service inacessível` | o uvicorn não está rodando na porta 8000 |

## Dívidas técnicas conhecidas

- **Sem testes automatizados.** O montador do dossiê é função pura — melhor
  candidato para o primeiro teste.
- **Sem `vercel.json`.** O `api/index.js` existe, mas falta a configuração de build.
- **Prisma não é injetável.** Os repositories importam o singleton global, o que
  impede mock em teste.
- **Falta `@@unique(form_id, template_id)`** em `Measurement` e `Checklist` — sem
  ela o `skipDuplicates` do sync não faz nada.
- **Rotas do projeto original ainda ausentes** — lista no fim de [api.md](api.md).
