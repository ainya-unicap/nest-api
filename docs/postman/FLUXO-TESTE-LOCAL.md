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
- uma planta forrageira semeada;
- pelo menos um `PlantTemplate` vinculado à planta.

O `plantId` não é exposto por uma rota pública neste projeto. Obtenha um UUID de
planta pelo seed/banco local e preencha a variável `plantId` da coleção.

## 2. Importar e configurar

1. Importe `donkeycode-local.postman_collection.json` no Postman.
2. Abra as variáveis da coleção.
3. Confira `baseUrl`, `email` e `password`.
4. Substitua `plantId` por um UUID existente.
5. Use um email ainda não cadastrado ou mantenha o mesmo usuário para repetir o
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

### 02 - Recursos e plantio

1. `Listar plant templates`
2. `Criar canteiro`
3. `Criar lista de formularios`

O primeiro template retornado é salvo automaticamente em `templateId`. O
canteiro e a lista precisam usar a mesma planta informada em `plantId`.

### 03 - Formulario semanal

1. `Criar formulario`
2. `Adicionar checklist em lote`
3. `Adicionar medicao em lote`
4. `Consultar formulario`
5. `Finalizar formulario`

O `formId` é capturado na criação. Checklist e medição usam o `templateId`
obtido anteriormente.

### 04 - Consultas e sessao

1. `Listar formularios do usuario`
2. `Consultar dossie da lista`
3. `Renovar tokens`
4. `Logout`

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

Esses testes devem ser feitos somente contra a instância local.

## 5. Critério de aprovação

Considere o fluxo aprovado quando:

- o cadastro/login funciona;
- os scripts capturam tokens e IDs sem edição manual, exceto `plantId`;
- as rotas protegidas retornam `200`/`201` conforme a operação;
- o formulário pode ser criado, consultado e finalizado;
- o refresh rotaciona os tokens;
- o logout invalida o refresh token;
- as verificações negativas retornam os códigos de segurança esperados.

A coleção não executa upload de arquivo nem dispara resumo por IA por padrão,
porque esses cenários exigem arquivo, credenciais de serviço e/ou dados
persistidos específicos. Eles devem ser testados em uma segunda coleção com
fixtures controlados.
