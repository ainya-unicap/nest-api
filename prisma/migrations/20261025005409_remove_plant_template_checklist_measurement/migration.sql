-- Remove PlantTemplate, Checklist e Measurement: o formulário novo usa
-- campos fixos (iguais para qualquer planta), então esse sistema de campos
-- configuráveis por espécie não é mais usado em lugar nenhum da aplicação.

-- Ordem importa: Checklist e Measurement têm FK para PlantTemplate, então
-- saem primeiro.
DROP TABLE "Checklist";
DROP TABLE "Measurement";
DROP TABLE "PlantTemplate";
