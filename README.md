# DonkeyCode — Back-end (NestJS)

API do projeto de acompanhamento de **plantas forrageiras**. Alunos registram
formulários semanais de campo (medições, checklist, fotos, observações) sobre
canteiros; a partir desses dados a API monta relatórios e gera, com IA, uma
documentação sobre o cultivo e os cuidados da planta.

**Stack:** NestJS 10 · TypeScript · Prisma 7 · PostgreSQL (Neon) · JWT ·
Swagger · Python/FastAPI + Groq (serviço de IA)

---

## Subir o projeto

```bash
npm install
npm run prisma:generate     # gera o Prisma Client (não vem no git)
npm run dev                 # http://localhost:3000
```

O `.env` precisa de duas variáveis no mínimo (copie de [`.env.example`](.env.example)):

```env
DATABASE_URL=postgresql://...      # Neon ou Postgres local
JWT_SECRET=uma-string-longa        # sem isso a aplicação não sobe
```

| endereço | o que é |
|---|---|
| `http://localhost:3000/api` | a API |
| `http://localhost:3000/api/docs` | Swagger (93 rotas documentadas) |
| `http://localhost:3000/api/docs.json` | o spec OpenAPI |

Para o resumo por IA, veja [docs/ia.md](docs/ia.md) — é um segundo processo.

---

## Documentação

| documento | conteúdo |
|---|---|
| [docs/arquitetura.md](docs/arquitetura.md) | camadas, fluxo de uma requisição, mapa de pastas |
| [docs/banco-de-dados.md](docs/banco-de-dados.md) | as 16 tabelas, relacionamentos e armadilhas do schema |
| [docs/api.md](docs/api.md) | todos os endpoints, autenticação e formato de erro |
| [docs/ia.md](docs/ia.md) | o resumo por IA: como funciona, configurar e rodar |
| [docs/desenvolvimento.md](docs/desenvolvimento.md) | scripts, seeds, migrations e problemas comuns |

---

## Comandos

| comando | faz |
|---|---|
| `npm run dev` | sobe em watch |
| `npm run build` | compila para `dist/` |
| `npm start` | roda o build |
| `npm run prisma:generate` | gera o Prisma Client |
| `npm run prisma:deploy` | aplica migrations pendentes (**não reseta** — use este no Neon) |
| `npm run prisma:migrate` | cria e aplica migration (**só contra banco local**) |
| `npm run prisma:seed` | popula plantas, templates e períodos |
| `npx tsx prisma/seed-demo.ts` | cria o acompanhamento de demonstração |
| `node scripts/limpar-dados-teste.cjs` | remove dados de teste (preview; `--executar` aplica) |

---

## Estado atual

- ✅ 93 rotas, todas documentadas no Swagger
- ✅ Autenticação JWT global (tudo protegido, exceto 5 rotas públicas)
- ✅ 7 migrations aplicadas, schema sincronizado
- ✅ Serviço de IA completo — falta apenas a `GROQ_API_KEY`
- ⚠️ **Sem testes automatizados**
- ⚠️ Sem `vercel.json` — o deploy na Vercel ainda não está configurado
