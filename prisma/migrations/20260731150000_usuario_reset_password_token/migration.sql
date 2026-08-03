-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "resetTokenHash" TEXT,
ADD COLUMN     "resetTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_resetTokenHash_key" ON "Usuario"("resetTokenHash");
