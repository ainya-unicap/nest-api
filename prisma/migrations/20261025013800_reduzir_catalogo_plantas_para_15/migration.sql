-- Reduz o catálogo de plantas forrageiras de 60 para 15, escolhidas pra
-- cobrir as categorias principais e a relevância regional (semiárido/NE,
-- com peso em palma forrageira). Ver conversa do time para a lista.
--
-- Decisão do time: canteiro que usar uma planta removida é apagado junto,
-- em cascata (listas, formulários, fotos, relatórios, resumos de IA).
-- As FKs do banco são ON DELETE RESTRICT, então a ordem importa.

-- As 15 plantas que ficam.
CREATE TEMP TABLE _plantas_mantidas AS
SELECT unnest(ARRAY[
  'pf-041', -- Capim Mombaça
  'pf-040', -- Capim Tanzânia
  'pf-030', -- BRS Piatã
  'pf-051', -- Brachiaria decumbens
  'pf-024', -- Brachiaria ruziziensis
  'pf-016', -- Tifton
  'pf-042', -- Capim-elefante cv. Mott
  'pf-034', -- BRS Capiaçu
  'pf-001', -- Gliricídia
  'pf-002', -- Leucena
  'pf-018', -- Guandu
  'pf-005', -- Palma Gigante
  'pf-006', -- Palma Miúda
  'pf-039', -- Milheto
  'pf-027'  -- Cana-de-açúcar
]) AS id;

-- Canteiros/listas/formulários que dependem de uma planta que vai sair.
CREATE TEMP TABLE _canteiros_removidos AS
SELECT id FROM "Canteiro" WHERE plant_id NOT IN (SELECT id FROM _plantas_mantidas);

CREATE TEMP TABLE _listas_removidas AS
SELECT id FROM "ListaDeFormularios" WHERE canteiro_id IN (SELECT id FROM _canteiros_removidos);

CREATE TEMP TABLE _formularios_removidos AS
SELECT id FROM "Formulario" WHERE list_id IN (SELECT id FROM _listas_removidas);

-- Apaga de baixo para cima, respeitando as FKs (ON DELETE RESTRICT).
DELETE FROM "Photo" WHERE form_id IN (SELECT id FROM _formularios_removidos);
DELETE FROM "ResumoIA" WHERE list_id IN (SELECT id FROM _listas_removidas);
DELETE FROM "Formulario" WHERE id IN (SELECT id FROM _formularios_removidos);
DELETE FROM "Relatorio" WHERE list_id IN (SELECT id FROM _listas_removidas)
  OR canteiro_id IN (SELECT id FROM _canteiros_removidos);
DELETE FROM "ListaDeFormularios" WHERE id IN (SELECT id FROM _listas_removidas);
DELETE FROM "UserCanteiro" WHERE canteiro_id IN (SELECT id FROM _canteiros_removidos);
DELETE FROM "Canteiro" WHERE id IN (SELECT id FROM _canteiros_removidos);

-- Agora sim: remove as 45 plantas que não ficam.
DELETE FROM "PlantaForrageira" WHERE id NOT IN (SELECT id FROM _plantas_mantidas);

DROP TABLE _plantas_mantidas;
DROP TABLE _canteiros_removidos;
DROP TABLE _listas_removidas;
DROP TABLE _formularios_removidos;
