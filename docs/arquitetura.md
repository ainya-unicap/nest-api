# Arquitetura

## Camadas

```
Controller  →  Service  →  Repository  →  Prisma  →  PostgreSQL
   HTTP        regras       queries
```

- **Controller** — rota, validação de formato, documentação Swagger. Não tem regra de negócio.
- **Service** — regras: quem pode, o que é obrigatório, o que acontece em transação.
- **Repository** — só query. Nenhum `if` de negócio aqui.

Os services que só cuidam de autenticação e usuário (`auth.service`, `user.service`)
falam direto com o Prisma, sem repository — herança do projeto original.

## Fluxo de uma requisição

```
   ↓ HTTP
1. enableCors()                 CORS liberado (o front roda em outra origem)
2. setGlobalPrefix('api')       tudo vive sob /api
3. JwtAuthGuard (global)        401 se não houver Bearer válido
                                └─ rotas com @Public() passam direto
4. ValidationPipe               whitelist + transform
5. Controller → Service → Repository → Prisma
6. HttpErrorFilter (global)     converte a exceção no status certo
   ↓ { ...dados }  ou  { "error": "mensagem" }
```

### Duas peças que sustentam esse fluxo

**`JwtAuthGuard`** ([src/core/auth/jwt-auth.guard.ts](../src/core/auth/jwt-auth.guard.ts)) —
registrado como `APP_GUARD`, ou seja, **tudo é protegido por padrão**. Abrir uma rota
é uma decisão explícita com `@Public()`. Ele valida o Bearer e popula `req.user`.

**`HttpErrorFilter`** ([src/core/http-exception.filter.ts](../src/core/http-exception.filter.ts)) —
os services lançam `HttpError`, uma classe própria que o Nest não reconhece. Sem
este filtro, todo 400/403/404 viraria 500. Ele também respeita respostas já
iniciadas (o `export-pdf` faz stream).

## Mapa de pastas

```
src/
├── index.ts                  bootstrap: CORS, prefixo, Swagger, uploads, shutdown
├── app.module.ts             registra os módulos, o guard e o filtro globais
├── prisma.ts                 PrismaClient único (adapter pg) + timeouts
├── core/
│   ├── auth/                 guard JWT, @Public(), @CurrentUserId(), segredo
│   ├── http-exception.filter.ts
│   ├── httpError.ts          a exceção usada pelos services
│   ├── rate-limit.ts         10 tentativas de login / 15 min por IP
│   ├── upload.config.ts      multer: disco em dev, memória na Vercel
│   └── storage.ts            grava o arquivo (disco ou Vercel Blob)
├── modules/<dominio>/        controller + module de cada domínio (17)
├── services/                 regras de negócio (18)
├── repositories/             acesso a dados (17)
├── swagger/                  configuração do Swagger e decorators compartilhados
└── types/express.d.ts        adiciona req.user ao Request do Express

prisma/                       schema, 7 migrations, seed e seed de demonstração
scripts/                      utilitários operacionais (limpeza de dados de teste)
ai-service/                   serviço Python do resumo por IA (processo separado)
api/index.js                  handler serverless da Vercel
```

## Decisões que valem conhecer

**CommonJS, não ESM.** O projeto usava `"type": "module"` + `tsx`. Dois problemas:
o esbuild (que o `tsx` usa) **não emite `emitDecoratorMetadata`**, então toda a
injeção de dependência do Nest chegava `undefined`; e o output ESM do `tsc` gera
imports sem extensão, que o Node não resolve. Migrado para CommonJS com
`@nestjs/cli` — que é o padrão do NestJS.

**Aliases de rota vão num decorator só.** `@Get('a')` empilhado com `@Get('b')`
não registra duas rotas: o Nest sobrescreve a metadata e só a última vale. O certo
é `@Get(['a', 'b'])`. Para verbos diferentes, dois handlers.

**O `userId` vem do token, nunca do corpo.** Em relatórios o body ainda aceita o
campo por compatibilidade, mas ele é ignorado — senão qualquer um editaria
relatório alheio trocando um JSON.

**Números são calculados no servidor.** O dossiê enviado à IA já traz min, máx,
média e variação prontos. Modelo de linguagem erra aritmética; ele escreve o
texto, não faz a conta.

## Integração com o serviço de IA

```
Front ──POST /api/listas-formularios/:id/resumo-ia──> Nest ──POST /resumir──> ai-service ──> Groq / Gemini
                                                        │
                                                   ResumoIA (status)
```

O front conversa **só com o Nest**. O `ai-service` é privado, protegido por um
segredo compartilhado (`X-Internal-Token`), e não conhece o banco — recebe JSON,
devolve JSON. Detalhes em [ia.md](ia.md).
