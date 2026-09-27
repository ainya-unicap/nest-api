-- ============================================================================
-- 1) DESDUPLICA PlantTemplate
-- O seed usava plantTemplate.create() sem upsert, entao cada execucao inseria
-- tudo de novo: 680 linhas = 340 campos x 2 copias. As medicoes ja estavam
-- espalhadas entre as copias (22 combinacoes lista+campo afetadas), o que
-- quebraria a serie temporal montada para a IA.
-- Regra: sobrevive a copia mais antiga de cada (plant_id, field_name).
-- ============================================================================

-- Reaponta as medicoes das copias para o template sobrevivente.
UPDATE "Measurement" m
SET "template_id" = s."sobrevivente"
FROM (
    SELECT t."id" AS "dup_id",
           FIRST_VALUE(t."id") OVER (
               PARTITION BY t."plant_id", t."field_name"
               ORDER BY t."createdAt", t."id"
           ) AS "sobrevivente"
    FROM "PlantTemplate" t
) s
WHERE m."template_id" = s."dup_id"
  AND s."dup_id" <> s."sobrevivente";

-- Mesmo tratamento para os itens de checklist.
UPDATE "Checklist" c
SET "template_id" = s."sobrevivente"
FROM (
    SELECT t."id" AS "dup_id",
           FIRST_VALUE(t."id") OVER (
               PARTITION BY t."plant_id", t."field_name"
               ORDER BY t."createdAt", t."id"
           ) AS "sobrevivente"
    FROM "PlantTemplate" t
) s
WHERE c."template_id" = s."dup_id"
  AND s."dup_id" <> s."sobrevivente";

-- Agora as copias estao sem referencias e podem sair.
DELETE FROM "PlantTemplate" t
USING (
    SELECT t2."id" AS "dup_id",
           FIRST_VALUE(t2."id") OVER (
               PARTITION BY t2."plant_id", t2."field_name"
               ORDER BY t2."createdAt", t2."id"
           ) AS "sobrevivente"
    FROM "PlantTemplate" t2
) s
WHERE t."id" = s."dup_id"
  AND s."dup_id" <> s."sobrevivente";

-- Impede que o problema volte, mesmo se o seed rodar de novo.
CREATE UNIQUE INDEX "PlantTemplate_plant_id_field_name_key"
    ON "PlantTemplate"("plant_id", "field_name");

-- ============================================================================
-- 2) TIPO DO CAMPO (numerico x categorico)
-- "unit" vinha sendo usado como lista de opcoes ("vegetativo/elongacao/...")
-- em alguns templates e como unidade de verdade em outros. Detectar pelo "/"
-- nao funciona: "perfilhos/m2" tem barra e e numerico. Precisa ser explicito.
-- ============================================================================
ALTER TABLE "PlantTemplate" ADD COLUMN "field_type" TEXT NOT NULL DEFAULT 'NUMERICO';

UPDATE "PlantTemplate"
SET "field_type" = 'CATEGORICO'
WHERE "unit" IN (
    'vegetativo/elongação/florescimento',
    'vegetativo/florescimento/frutificação',
    'V1/V2/VT/R1/R2/R3',
    'VE/V1/V2/R1/R2/R3/R4'
);

-- ============================================================================
-- 3) INDICES NAS CHAVES ESTRANGEIRAS
-- O Postgres nao cria indice automatico para FK. O banco tinha um unico indice
-- (RefreshToken_userId_idx) e o dossie filtra exatamente por list_id, form_id
-- e template_id.
-- (PlantTemplate.plant_id ja e atendido pelo indice unico criado acima.)
-- ============================================================================
CREATE INDEX "Formulario_list_id_idx" ON "Formulario"("list_id");
CREATE INDEX "Formulario_user_id_idx" ON "Formulario"("user_id");
CREATE INDEX "Measurement_form_id_idx" ON "Measurement"("form_id");
CREATE INDEX "Measurement_template_id_idx" ON "Measurement"("template_id");
CREATE INDEX "Checklist_form_id_idx" ON "Checklist"("form_id");
CREATE INDEX "Checklist_template_id_idx" ON "Checklist"("template_id");
CREATE INDEX "Photo_form_id_idx" ON "Photo"("form_id");
CREATE INDEX "ListaDeFormularios_canteiro_id_idx" ON "ListaDeFormularios"("canteiro_id");
CREATE INDEX "ListaDeFormularios_plant_id_idx" ON "ListaDeFormularios"("plant_id");
CREATE INDEX "ListaDeFormularios_created_by_idx" ON "ListaDeFormularios"("created_by");
CREATE INDEX "Canteiro_plant_id_idx" ON "Canteiro"("plant_id");
CREATE INDEX "Relatorio_user_id_idx" ON "Relatorio"("user_id");
CREATE INDEX "Relatorio_list_id_idx" ON "Relatorio"("list_id");
CREATE INDEX "Relatorio_canteiro_id_idx" ON "Relatorio"("canteiro_id");
-- A PK composta e (user_id, canteiro_id): busca so por canteiro_id nao a usa.
CREATE INDEX "UserCanteiro_canteiro_id_idx" ON "UserCanteiro"("canteiro_id");
CREATE INDEX "AlunoTurma_turma_id_idx" ON "AlunoTurma"("turma_id");
CREATE INDEX "Turma_institution_id_idx" ON "Turma"("institution_id");
CREATE INDEX "Turma_period_id_idx" ON "Turma"("period_id");
CREATE INDEX "Turma_created_by_idx" ON "Turma"("created_by");
CREATE INDEX "User_institution_id_idx" ON "User"("institution_id");

-- ============================================================================
-- 4) TABELA ResumoIA
-- Guarda o resumo gerado pela IA a partir dos formularios de uma lista.
-- O fluxo e assincrono (limite de 10s da Vercel Hobby): o POST cria a linha
-- como PENDENTE e o front consulta ate virar PRONTO ou ERRO.
-- "dossie" guarda a entrada exata enviada ao modelo, para auditoria.
-- ============================================================================
CREATE TABLE "ResumoIA" (
    "id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "secoes" JSONB,
    "dossie" JSONB,
    "modelo" TEXT,
    "prompt_versao" TEXT,
    "tokens_entrada" INTEGER,
    "tokens_saida" INTEGER,
    "duracao_ms" INTEGER,
    "erro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "concluidoEm" TIMESTAMP(3),

    CONSTRAINT "ResumoIA_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResumoIA_list_id_idx" ON "ResumoIA"("list_id");
CREATE INDEX "ResumoIA_user_id_idx" ON "ResumoIA"("user_id");
CREATE INDEX "ResumoIA_status_idx" ON "ResumoIA"("status");

-- Cascade de proposito: as demais FKs do projeto sao RESTRICT, o que ja causou
-- falha em DELETE de formulario. Um resumo nao deve segurar a lista nem o usuario.
ALTER TABLE "ResumoIA" ADD CONSTRAINT "ResumoIA_list_id_fkey"
    FOREIGN KEY ("list_id") REFERENCES "ListaDeFormularios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResumoIA" ADD CONSTRAINT "ResumoIA_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
