-- "Altura estimada (cm)" e "Fase da planta" são opcionais no formulário do app,
-- mas as colunas eram NOT NULL — quem deixava em branco levava 400.
--
-- `weather` segue obrigatório.
--
-- Só afrouxa a restrição: nenhuma linha existente é alterada e a migration não
-- pode falhar. Aplica no deploy (vercel-build roda prisma migrate deploy).
ALTER TABLE "Formulario" ALTER COLUMN "estimated_height_cm" DROP NOT NULL;
ALTER TABLE "Formulario" ALTER COLUMN "phenological_stage" DROP NOT NULL;
