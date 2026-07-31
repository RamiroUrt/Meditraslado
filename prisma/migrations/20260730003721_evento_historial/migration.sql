-- CreateTable
CREATE TABLE "Evento" (
    "id" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "usuarioNombre" TEXT,
    "pacienteId" TEXT,
    "trasladoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Evento_createdAt_idx" ON "Evento"("createdAt");

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_trasladoId_fkey" FOREIGN KEY ("trasladoId") REFERENCES "Traslado"("id") ON DELETE SET NULL ON UPDATE CASCADE;
