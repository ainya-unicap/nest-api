# DonkeyCode — Back-end (NestJS)

API do projeto de acompanhamento de **plantas forrageiras**. Alunos registram
formulários semanais de campo (altura, estado fenológico, clima, checklist,
fotos, observações) sobre canteiros; a partir desses dados a API monta um
dossiê consolidado e relatórios acadêmicos.

**Stack:** NestJS 10 · TypeScript · Prisma 7 · PostgreSQL (Neon) · JWT ·
Swagger

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
| `http://localhost:3000/api/docs` | Swagger (70 rotas documentadas) |
| `http://localhost:3000/api/docs.json` | o spec OpenAPI |

---

## Documentação

| documento | conteúdo |
|---|---|
| [docs/arquitetura.md](docs/arquitetura.md) | camadas, fluxo de uma requisição, mapa de pastas |
| [docs/banco-de-dados.md](docs/banco-de-dados.md) | as 13 tabelas, relacionamentos e armadilhas do schema |
| [docs/api.md](docs/api.md) | todos os endpoints, autenticação e formato de erro |
| [docs/desenvolvimento.md](docs/desenvolvimento.md) | scripts, seeds, migrations e problemas comuns |
| [docs/sonarqube.md](docs/sonarqube.md) | análise de qualidade com SonarQube local (Docker) |

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
| `npm run prisma:seed` | popula instituição, plantas e períodos letivos |
| `npx tsx prisma/seed-demo.ts` | cria o acompanhamento de demonstração |
| `node scripts/limpar-dados-teste.cjs` | remove dados de teste (preview; `--executar` aplica) |

---

## Estado atual

- ✅ 70 rotas, todas documentadas no Swagger
- ✅ Autenticação JWT global (tudo protegido, exceto 5 rotas públicas) + reCAPTCHA no login/cadastro
- ✅ 11 migrations aplicadas, schema sincronizado
- ✅ Deploy configurado na Vercel (`vercel.json`), Postgres no Neon, upload no Vercel Blob
- ⚠️ **Sem testes automatizados**
