-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN     "choferVueltaId" TEXT,
ADD COLUMN     "duracionEstimadaMin" INTEGER NOT NULL DEFAULT 45;

-- AddForeignKey
ALTER TABLE "Paciente" ADD CONSTRAINT "Paciente_choferVueltaId_fkey" FOREIGN KEY ("choferVueltaId") REFERENCES "Chofer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
