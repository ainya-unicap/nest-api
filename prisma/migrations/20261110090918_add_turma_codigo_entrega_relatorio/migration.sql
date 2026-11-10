-- AlterTable
ALTER TABLE "Canteiro" ADD COLUMN "turma_id" TEXT;

-- CreateTable
CREATE TABLE "TurmaCodigo" (
    "id" TEXT NOT NULL,
    "turma_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TurmaCodigo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntregaRelatorio" (
    "id" TEXT NOT NULL,
    "turma_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntregaRelatorio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Canteiro_turma_id_idx" ON "Canteiro"("turma_id");

-- CreateIndex
CREATE UNIQUE INDEX "TurmaCodigo_code_key" ON "TurmaCodigo"("code");

-- CreateIndex
CREATE INDEX "TurmaCodigo_turma_id_idx" ON "TurmaCodigo"("turma_id");

-- CreateIndex
CREATE UNIQUE INDEX "EntregaRelatorio_user_id_turma_id_key" ON "EntregaRelatorio"("user_id", "turma_id");

-- CreateIndex
CREATE INDEX "EntregaRelatorio_turma_id_idx" ON "EntregaRelatorio"("turma_id");

-- CreateIndex
CREATE INDEX "EntregaRelatorio_user_id_idx" ON "EntregaRelatorio"("user_id");

-- AddForeignKey
ALTER TABLE "Canteiro" ADD CONSTRAINT "Canteiro_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "Turma"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurmaCodigo" ADD CONSTRAINT "TurmaCodigo_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaRelatorio" ADD CONSTRAINT "EntregaRelatorio_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaRelatorio" ADD CONSTRAINT "EntregaRelatorio_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
