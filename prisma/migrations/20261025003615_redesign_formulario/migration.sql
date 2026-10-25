-- Redesenho do Formulario: campos fixos (altura, estado fenológico,
-- condição do tempo e checklist de 5 itens), iguais para qualquer planta.
-- Decisão do time: não migrar os dados antigos (medições/checklist via
-- PlantTemplate) — apaga e recomeça do zero no novo formato.

-- 1) Limpa os registros antigos de formulário, na ordem certa por causa das
--    FKs (ON DELETE RESTRICT: os filhos têm que sair antes do pai).
DELETE FROM "Checklist";
DELETE FROM "Measurement";
DELETE FROM "Photo";
DELETE FROM "Formulario";

-- 2) Remove o intervalo antigo de datas.
ALTER TABLE "Formulario" DROP COLUMN "started_at";
ALTER TABLE "Formulario" DROP COLUMN "ended_at";

-- 3) Campos novos. NOT NULL sem default é seguro aqui porque a tabela está
--    vazia (passo 1) — nenhuma linha existente para violar a constraint.
ALTER TABLE "Formulario" ADD COLUMN "title" TEXT NOT NULL;
ALTER TABLE "Formulario" ADD COLUMN "date" TIMESTAMP(3) NOT NULL;
ALTER TABLE "Formulario" ADD COLUMN "weather" TEXT NOT NULL;
ALTER TABLE "Formulario" ADD COLUMN "estimated_height_cm" DOUBLE PRECISION NOT NULL;
ALTER TABLE "Formulario" ADD COLUMN "phenological_stage" TEXT NOT NULL;
ALTER TABLE "Formulario" ADD COLUMN "checklist_irrigacao" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Formulario" ADD COLUMN "checklist_capina" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Formulario" ADD COLUMN "checklist_adubacao" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Formulario" ADD COLUMN "checklist_plantio" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Formulario" ADD COLUMN "checklist_pragas" BOOLEAN NOT NULL DEFAULT false;
