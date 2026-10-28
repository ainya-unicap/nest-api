-- AlterTable
ALTER TABLE "User" ADD COLUMN "matricula" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_institution_id_matricula_key" ON "User"("institution_id", "matricula");
