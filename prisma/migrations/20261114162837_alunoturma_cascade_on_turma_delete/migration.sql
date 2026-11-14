-- DropForeignKey
ALTER TABLE "AlunoTurma" DROP CONSTRAINT "AlunoTurma_turma_id_fkey";

-- AddForeignKey
-- Sem isso, apagar uma turma com pelo menos um aluno vinculado falhava com
-- FK violation (RESTRICT) em DELETE /professores/turmas/:id.
ALTER TABLE "AlunoTurma" ADD CONSTRAINT "AlunoTurma_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
