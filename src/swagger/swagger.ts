import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const BEARER_AUTH = 'bearer';

// Ordem em que as tags aparecem no Swagger UI.
const TAGS: Array<[string, string]> = [
  ['Auth', 'Login, refresh e logout (rotas públicas)'],
  ['Users', 'Cadastro, listagem e perfil de usuários'],
  ['Institutions', 'Instituições de ensino'],
  ['Alunos', 'Resumo e home do aluno'],
  ['UserCanteiros', 'Vínculo entre usuário e canteiro'],
  ['Canteiros', 'Canteiros de plantio'],
  ['ListasFormularios', 'Listas de formulários de um canteiro'],
  ['Formularios', 'Formulários de campo e seus itens'],
  ['Checklist', 'Itens de checklist de um formulário'],
  ['Measurements', 'Medições de um formulário'],
  ['Photos', 'Fotos de um formulário'],
  ['PlantTemplates', 'Campos configuráveis por planta'],
  ['Relatorios', 'Relatórios acadêmicos e exportação em PDF'],
  ['Turmas', 'Turmas'],
  ['AlunoTurma', 'Matrícula de aluno em turma'],
  ['AcademicPeriods', 'Períodos letivos'],
];

// CSS e JS do Swagger UI servidos via CDN para funcionar no Vercel serverless
// (o express.static do swagger-ui-express não enxerga node_modules no deploy).
const swaggerUiOptions = {
  customSiteTitle: 'DonkeyCode API',
  customCssUrl: 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css',
  customJs: [
    'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js',
    'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js',
  ],
  swaggerOptions: {
    persistAuthorization: true,
  },
  jsonDocumentUrl: 'api/docs.json',
};

export function setupSwagger(app: INestApplication) {
  const port = process.env.PORT || 3000;

  const builder = new DocumentBuilder()
    .setTitle('DonkeyCode Back-end (NestJS)')
    .setVersion('0.1.0')
    .setDescription(
      [
        'API do projeto DonkeyCode. Use este Swagger para testar os endpoints.',
        '',
        'Quase tudo exige `Authorization: Bearer <accessToken>`. As únicas rotas',
        'abertas são `POST /users` (cadastro), `POST /users/login`, `/refresh`,',
        '`/logout` e `GET /institutions`.',
        '',
        'Para autenticar aqui: chame `POST /users/login`, copie o `accessToken`',
        'da resposta e cole no botão **Authorize** acima.',
      ].join('\n'),
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      BEARER_AUTH,
    )
    // Relativo e primeiro da lista: chama o mesmo host em que o Swagger foi aberto
    // (local, Codespace ou Vercel), sem precisar trocar o server no seletor.
    .addServer('/api', 'este servidor')
    .addServer('https://back-end-ainya.vercel.app/api', 'produção (Vercel)')
    .addServer(`http://localhost:${port}/api`, 'local');

  for (const [name, description] of TAGS) {
    builder.addTag(name, description);
  }

  // ignoreGlobalPrefix mantém os paths sem /api — o prefixo já está na URL dos
  // servers acima, igual ao Swagger do projeto original. Sem isso o "Try it out"
  // montaria /api/api/....
  const document = SwaggerModule.createDocument(app, builder.build(), {
    ignoreGlobalPrefix: true,
  });

  SwaggerModule.setup('api/docs', app, document, swaggerUiOptions);
}
