-- Deduplica vínculos antes de trocar para PK composta (preserva o mais antigo de cada par).
DELETE FROM "AlunoTurma" a
USING "AlunoTurma" b
WHERE a."createdAt" > b."createdAt"
  AND a."user_id" = b."user_id"
  AND a."turma_id" = b."turma_id";

-- Drop da PK atual (id) e da coluna id.
ALTER TABLE "AlunoTurma" DROP CONSTRAINT "AlunoTurma_pkey";
ALTER TABLE "AlunoTurma" DROP COLUMN "id";

-- Nova PK composta.
ALTER TABLE "AlunoTurma" ADD CONSTRAINT "AlunoTurma_pkey" PRIMARY KEY ("user_id", "turma_id");
