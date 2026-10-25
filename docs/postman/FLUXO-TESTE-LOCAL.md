# Fluxo de teste local no Postman

## 1. Preparar o ambiente

Na raiz do projeto:

```powershell
npm install
npx prisma generate
npm run dev
```

A API deve responder em `http://localhost:3000`. A documentação Swagger fica
em <http://localhost:3000/api/docs>.

Antes do fluxo, garanta que o PostgreSQL está disponível e que o banco possui
pelo menos:

- uma instituição, caso queira associá-la ao usuário;
- uma planta forrageira semeada (`npm run prisma:seed`).

O `plantId` não é exposto por uma rota pública neste projeto. Obtenha um UUID de
planta pelo seed/banco local e preencha a variável `plantId` da coleção.

### reCAPTCHA

`POST /users` (cadastro) e `POST /users/login` são protegidos por reCAPTCHA. Se
o seu `.env` local tiver `RECAPTCHA_SECRET` configurado, essas rotas exigem um
token válido. Duas opções:

- **Mais simples para testar localmente:** deixe `RECAPTCHA_SECRET` vazio no
  `.env` — a verificação fica desativada automaticamente fora de produção.
- **Se precisar manter o secret configurado:** defina também
  `RECAPTCHA_BYPASS_TOKEN` no `.env` e cole o mesmo valor na variável
  `recaptchaToken` da coleção (veja [a implementação](../../src/core/recaptcha/recaptcha.service.ts)).

## 2. Importar e configurar

1. Importe `donkeycode-local.postman_collection.json` no Postman.
2. Abra as variáveis da coleção.
3. Confira `baseUrl`, `email` e `password`.
4. Substitua `plantId` por um UUID existente.
5. Preencha `recaptchaToken` conforme a seção acima (ou deixe em branco se o
   reCAPTCHA estiver desativado no seu `.env`).
6. Use um email ainda não cadastrado ou mantenha o mesmo usuário para repetir o
   fluxo.

Os tokens e IDs criados são armazenados automaticamente nas variáveis da
coleção. Não exporte a coleção depois de executar o login sem remover os
valores de `accessToken` e `refreshToken`.

## 3. Ordem do fluxo principal

Execute as pastas na ordem apresentada na coleção. Dentro de cada pasta, use
`Run folder`:

### 01 - Preparacao publica

1. `Listar instituicoes`
2. `Cadastrar usuario de teste`
3. `Login e captura de tokens`
4. `Buscar usuario autenticado`

O login precisa retornar `accessToken`, `refreshToken` e `id`. O script de teste
salva esses valores para as requisições protegidas.

### 02 - Canteiro e lista

1. `Criar canteiro`
2. `Criar lista de formularios`

O canteiro e a lista precisam usar a mesma planta informada em `plantId`.

### 03 - Formulario semanal

1. `Criar formulario` — já manda os campos fixos: `title`, `week`, `weather`,
   `estimated_height_cm`, `phenological_stage` e os 5 booleans de checklist.
2. `Atualizar formulario (checklist parcial)` — mostra que um `PATCH` com só
   um item do checklist não mexe nos outros 4.
3. `Consultar formulario`
4. `Upload de foto (manual)` — selecione um arquivo no campo `photo` antes de
   executar; o Postman não anexa arquivo sozinho. Limite de 5 fotos por
   formulário.
5. `Finalizar formulario`

O `formId` é capturado na criação.

### 04 - Consultas e sessao

1. `Listar formularios do usuario`
2. `Listar formularios do canteiro (organizado por lista)` — endpoint
   `GET /canteiros/:id/formularios`, agrupa por lista.
3. `Consultar dossie da lista`
4. `Renovar tokens`
5. `Logout`

O dossiê pode retornar `422` quando a lista ainda não contém dados suficientes;
essa resposta é tratada como esperada pelo teste da coleção.

## 4. Verificações negativas recomendadas

Faça estas verificações manualmente ou duplicando uma request antes de executar
as requests destrutivas:

| Verificação | Alteração | Resultado esperado |
|---|---|---|
| Sem token | Remover `Authorization` de `Buscar usuario autenticado` | `401` |
| Token inválido | Usar `Bearer token-invalido` | `401` |
| ID inexistente | Trocar `userId` por UUID aleatório | `404` |
| Credencial inválida | Alterar `password` no login | `401` |
| Refresh repetido | Executar o mesmo refresh token duas vezes | segunda tentativa `401` |
| Login excessivo | Fazer mais de 10 tentativas inválidas no período | `429` |
| Captcha ausente | Remover `recaptchaToken` do cadastro/login (com `RECAPTCHA_SECRET` configurado) | `400 CAPTCHA_AUSENTE` |
| 6ª foto do formulário | Repetir o upload de foto 6 vezes no mesmo `formId` | `400 LIMITE_FOTOS_ATINGIDO` |

Esses testes devem ser feitos somente contra a instância local.

## 5. Critério de aprovação

Considere o fluxo aprovado quando:

- o cadastro/login funciona;
- os scripts capturam tokens e IDs sem edição manual, exceto `plantId` e `recaptchaToken`;
- as rotas protegidas retornam `200`/`201` conforme a operação;
- o formulário pode ser criado, atualizado parcialmente, consultado e finalizado;
- o checklist parcial não sobrescreve os itens não enviados;
- o refresh rotaciona os tokens;
- o logout invalida o refresh token;
- as verificações negativas retornam os códigos de segurança esperados.
