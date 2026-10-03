# SonarQube

Análise estática de qualidade e segurança do código (`src/` e `ai-service/`).
Roda localmente, em Docker, na versão Community. Não executa a aplicação: não
precisa de banco, `.env` nem servidor da API no ar.

## Arquivos

| arquivo | função |
|---|---|
| `docker-compose.sonar.yml` | sobe o servidor SonarQube em `localhost:9000`, com volumes para manter o histórico |
| `sonar-project.properties` | chave do projeto, endereço do servidor, pastas analisadas e exclusões |
| `package.json` | scripts `sonar:up`, `sonar:down` e `sonar` |

Exclusões: `dist/`, `node_modules/`, `public/`, `prisma/migrations/` e
`ai-service/__pycache__/`.

## Como usar

1. Abra o Docker Desktop e suba o servidor (leva ~2 min na primeira vez):

   ```bash
   npm run sonar:up
   ```

2. Acesse http://localhost:9000 (login `admin` / `admin`; ele pede para trocar a senha).
3. Na primeira vez, crie um projeto local com a chave `nest-ape` (a mesma de
   `sonar.projectKey`) e gere um token.
4. Rode a análise:

   ```bash
   npm run sonar -- -Dsonar.token=SEU_TOKEN
   ```

5. Veja o resultado em http://localhost:9000/dashboard?id=nest-ape
   (pode levar alguns segundos para o servidor processar o relatório).

Para desligar o servidor: `npm run sonar:down` (os dados ficam nos volumes).

> **Nunca grave o token em arquivo versionado.** Passe-o só na linha de comando
> ou numa variável de ambiente (`SONAR_TOKEN`).

## Onde olhar o resultado

- **Quality Gate** (topo do Overview): aprovado ou reprovado.
- **Security, Reliability, Maintainability**: notas de A a E para vulnerabilidades,
  bugs e code smells. Comece por Security.
- **Security Hotspots**: trechos sensíveis que exigem revisão manual.
- **Issues**: lista completa, com arquivo, linha e como corrigir. Filtre por
  severidade (Blocker e High primeiro).
- **Duplications**: percentual de código repetido.
- **Coverage**: aparece 0% porque o projeto ainda não tem testes automatizados.

## Problemas comuns

| sintoma | causa / solução |
|---|---|
| `You're not authorized to analyze this project` | a chave em `sonar.projectKey` difere da chave do projeto criado no servidor, ou o token é de outro projeto |
| servidor não sobe | Docker Desktop fechado ou sem WSL2; confira com `docker info` |
| dashboard vazio logo após a análise | o servidor ainda processa o relatório; aguarde alguns segundos |
