-- AlterTable
ALTER TABLE "Traslado" ADD COLUMN     "idaCancelada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vueltaCancelada" BOOLEAN NOT NULL DEFAULT false;
