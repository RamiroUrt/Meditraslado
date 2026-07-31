-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'RECEPCIONISTA', 'CHOFER');

-- CreateEnum
CREATE TYPE "EstadoTraslado" AS ENUM ('PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'EXPIRADO');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO');

-- CreateTable
CREATE TABLE "Centro" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Centro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "Role" NOT NULL,
    "centroId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chofer" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "licencia" TEXT,
    "vehiculoPlaca" TEXT,
    "telefonoAlternativo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chofer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "requiereSillaDeRuedas" BOOLEAN NOT NULL DEFAULT false,
    "observacion" TEXT,
    "centroId" TEXT NOT NULL,
    "choferAsignadoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PacienteHorario" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "dia" "DiaSemana" NOT NULL,
    "horaCita" TEXT NOT NULL,

    CONSTRAINT "PacienteHorario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PacienteCita" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaCita" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PacienteCita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Traslado" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaCita" TEXT NOT NULL,
    "estado" "EstadoTraslado" NOT NULL DEFAULT 'PENDIENTE',
    "choferId" TEXT NOT NULL,
    "choferRegresoId" TEXT,
    "pacienteId" TEXT NOT NULL,
    "centroDestinoId" TEXT NOT NULL,
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Traslado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Centro_nombre_key" ON "Centro"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Chofer_usuarioId_key" ON "Chofer"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "PacienteHorario_pacienteId_dia_key" ON "PacienteHorario"("pacienteId", "dia");

-- CreateIndex
CREATE UNIQUE INDEX "PacienteCita_pacienteId_fecha_key" ON "PacienteCita"("pacienteId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Traslado_codigo_key" ON "Traslado"("codigo");

-- CreateIndex
CREATE INDEX "Traslado_fecha_idx" ON "Traslado"("fecha");

-- CreateIndex
CREATE INDEX "Traslado_estado_idx" ON "Traslado"("estado");

-- CreateIndex
CREATE INDEX "Traslado_choferId_fecha_idx" ON "Traslado"("choferId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Traslado_pacienteId_fecha_key" ON "Traslado"("pacienteId", "fecha");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_centroId_fkey" FOREIGN KEY ("centroId") REFERENCES "Centro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chofer" ADD CONSTRAINT "Chofer_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paciente" ADD CONSTRAINT "Paciente_centroId_fkey" FOREIGN KEY ("centroId") REFERENCES "Centro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paciente" ADD CONSTRAINT "Paciente_choferAsignadoId_fkey" FOREIGN KEY ("choferAsignadoId") REFERENCES "Chofer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacienteHorario" ADD CONSTRAINT "PacienteHorario_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacienteCita" ADD CONSTRAINT "PacienteCita_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Traslado" ADD CONSTRAINT "Traslado_choferId_fkey" FOREIGN KEY ("choferId") REFERENCES "Chofer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Traslado" ADD CONSTRAINT "Traslado_choferRegresoId_fkey" FOREIGN KEY ("choferRegresoId") REFERENCES "Chofer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Traslado" ADD CONSTRAINT "Traslado_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Traslado" ADD CONSTRAINT "Traslado_centroDestinoId_fkey" FOREIGN KEY ("centroDestinoId") REFERENCES "Centro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
