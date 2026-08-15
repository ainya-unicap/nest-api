Migração fase 1 — Nest.js

O diretório api-nest contém a conversão inicial para Nest.js dos módulos centrais (auth, users, health, upload, prisma, swagger placeholder).

Como usar:
1. Entre na pasta:
   cd api-nest
2. Instale dependências:
   npm install
3. Configure variáveis de ambiente (exemplos):
   - DATABASE_URL (string de conexão PostgreSQL)
   - JWT_SECRET (segredo para tokens JWT)
   - VERCEL (opcional, define comportamento de uploads)
4. Geração do Prisma (se você usar os modelos originais):
   - Copie/ gere schema.prisma para a pasta prisma/ e rode: npm run prisma:build
   - Ou, se preferir, usar o pipeline do projeto original (cli/compactarModelos.ts), mantenha a cópia dos modelos originais e gere o schema
5. Rodar servidor em dev:
   npm run dev

Endpoints principais (fase 1):
- GET /api/hello  — health
- POST /api/users  — criar usuário
- POST /api/users/login  — login (retorna accessToken + refreshToken)
- POST /api/users/refresh  — trocar refresh token
- POST /api/users/logout  — logout
- GET /api/users  — listagem (protegido)
- GET /api/users/:id  — detalhes (protegido)
- PUT /api/users/:id/profile — atualizar perfil (protegido)
- PUT /api/users/:id/avatar — upload de avatar (protegido)

Observações:
- Esta é a primeira fase; os controllers/services restantes serão convertidos em batches.
- A implementação reaproveita a lógica original reimplementada como providers para auth e users; a integração com o restante do projeto (models .prisma) depende da geração correta do schema Prisma.
