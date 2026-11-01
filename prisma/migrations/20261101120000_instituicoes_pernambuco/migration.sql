-- ============================================================================
-- Instituições: substitui o conteúdo da tabela pelas instituições de
-- Pernambuco ligadas ao tema do app, e acrescenta a sigla.
--
-- Roda sozinha no deploy: o `vercel-build` executa `prisma migrate deploy`.
--
-- CONSEQUÊNCIA ESPERADA: User.institution_id e Turma.institution_id são
-- ON DELETE SET NULL, então quem estava vinculado a uma instituição antiga
-- fica com institution_id = NULL e precisa escolher de novo no app. Nenhum
-- usuário, turma ou canteiro é removido.
-- ============================================================================

-- 1) Sigla. Entra nullable para a tabela existente aceitar; vira NOT NULL no
--    passo 4, depois que só houver linhas com valor.
ALTER TABLE "Institution" ADD COLUMN "abbreviation" TEXT;

-- 2) As novas instituições, com ids fixos e legíveis (o seed faz upsert por
--    id, então rodar o seed depois atualiza em vez de duplicar).
--    ON CONFLICT: a migration fica idempotente se for reaplicada.
INSERT INTO "Institution" ("id", "name", "abbreviation", "createdAt", "updatedAt") VALUES
  ('inst-ufrpe',              'Universidade Federal Rural de Pernambuco',                          'UFRPE',             CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inst-ufape',              'Universidade Federal do Agreste de Pernambuco',                     'UFAPE',             CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inst-univasf',            'Universidade Federal do Vale do São Francisco',                     'UNIVASF',           CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inst-ifpe',               'Instituto Federal de Pernambuco',                                  'IFPE',              CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inst-if-sertao',          'Instituto Federal do Sertão Pernambucano',                          'IF Sertão-PE',      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inst-codai',              'Colégio Agrícola Dom Agostinho Ikas (UFRPE)',                       'CODAI',             CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inst-ipa',                'Instituto Agronômico de Pernambuco',                                'IPA',               CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inst-embrapa-semiarido',  'Empresa Brasileira de Pesquisa Agropecuária — Embrapa Semiárido',    'Embrapa Semiárido', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inst-upe',                'Universidade de Pernambuco',                                        'UPE',               CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inst-unicap',             'Universidade Católica de Pernambuco',                               'UNICAP',            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE
  SET "name" = EXCLUDED."name",
      "abbreviation" = EXCLUDED."abbreviation",
      "updatedAt" = CURRENT_TIMESTAMP;

-- 3) Remove as antigas (inclusive as "Instituição Teste ..." que sobraram dos
--    testes). Não pode falhar: as duas FKs que apontam para cá são SET NULL.
--
--    Nota: optamos por NÃO remapear usuários da antiga "UFRPE - Departamento
--    de Zootecnia" para 'inst-ufrpe'. O User tem @@unique([institution_id,
--    matricula]) e um remapeamento poderia colidir duas matrículas iguais,
--    fazendo a migration falhar — e falha aqui derruba o deploy inteiro
--    (o vercel-build encadeia com &&). Com poucos usuários, reescolher a
--    instituição no app é mais seguro que arriscar o build.
DELETE FROM "Institution"
WHERE "id" NOT IN (
  'inst-ufrpe',
  'inst-ufape',
  'inst-univasf',
  'inst-ifpe',
  'inst-if-sertao',
  'inst-codai',
  'inst-ipa',
  'inst-embrapa-semiarido',
  'inst-upe',
  'inst-unicap'
);

-- 4) Agora que toda linha tem sigla, fecha a coluna e impede sigla repetida.
ALTER TABLE "Institution" ALTER COLUMN "abbreviation" SET NOT NULL;

CREATE UNIQUE INDEX "Institution_abbreviation_key" ON "Institution"("abbreviation");
