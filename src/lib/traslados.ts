import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { registrarEvento } from "@/lib/eventos";
import type { DiaSemana, Traslado } from "@/types/models";

const DIA_POR_INDICE: DiaSemana[] = [
  "DOMINGO",
  "LUNES",
  "MARTES",
  "MIERCOLES",
  "JUEVES",
  "VIERNES",
  "SABADO",
];

export function rangoDia(fecha: Date) {
  const inicio = new Date(fecha);
  inicio.setUTCHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setUTCDate(fin.getUTCDate() + 1);
  return { inicio, fin };
}

export function generarCodigo() {
  const numero = Math.floor(Math.random() * 90 + 10);
  const letra = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `TRK_${numero}_${letra}`;
}

/** Trae un traslado por id y lo mapea al shape de `lib/types.ts`. Usado por las rutas POST/PATCH tras crear o editar. */
export async function obtenerTrasladoMapeado(id: string): Promise<Traslado> {
  const t = await prisma.traslado.findUniqueOrThrow({
    where: { id },
    include: {
      chofer: { include: { usuario: true } },
      choferRegreso: { include: { usuario: true } },
      centroDestino: true,
      paciente: {
        include: {
          centro: true,
          choferAsignado: { include: { usuario: true } },
          choferVuelta: { include: { usuario: true } },
          horarios: true,
        },
      },
    },
  });

  return {
    id: t.id,
    codigo: t.codigo,
    fecha: t.fecha.toISOString().slice(0, 10),
    horaCita: t.horaCita,
    chofer: { id: t.chofer.id, nombre: t.chofer.usuario.nombre },
    estado: t.estado,
    choferRegreso: t.choferRegreso
      ? { id: t.choferRegreso.id, nombre: t.choferRegreso.usuario.nombre }
      : null,
    idaCancelada: t.idaCancelada,
    vueltaCancelada: t.vueltaCancelada,
    paciente: {
      id: t.paciente.id,
      nombre: t.paciente.nombre,
      direccion: t.paciente.direccion,
      telefono: t.paciente.telefono,
      centro: { id: t.paciente.centro.id, nombre: t.paciente.centro.nombre },
      choferAsignado: t.paciente.choferAsignado
        ? { id: t.paciente.choferAsignado.id, nombre: t.paciente.choferAsignado.usuario.nombre }
        : null,
      choferVuelta: t.paciente.choferVuelta
        ? { id: t.paciente.choferVuelta.id, nombre: t.paciente.choferVuelta.usuario.nombre }
        : null,
      duracionEstimadaMin: t.paciente.duracionEstimadaMin,
      horarios: t.paciente.horarios.map((h) => ({ dia: h.dia, horaCita: h.horaCita })),
      activo: t.paciente.activo,
      requiereSillaDeRuedas: t.paciente.requiereSillaDeRuedas,
      observacion: t.paciente.observacion ?? undefined,
    },
    destino: t.centroDestino.nombre,
    centroDestino: { id: t.centroDestino.id, nombre: t.centroDestino.nombre },
    observacion: t.observacion ?? undefined,
  };
}

/** Genera los traslados del día para cada paciente activo que tenga turno hoy (horario recurrente o cita puntual) y todavía no tenga un traslado creado para esa fecha. Idempotente: no duplica si ya corrió. */
export async function generarTrasladosDelDia(fecha: Date = new Date()) {
  const { inicio, fin } = rangoDia(fecha);
  const diaSemana = DIA_POR_INDICE[fecha.getUTCDay()];

  const [pacientes, existentes, citasHoy] = await Promise.all([
    prisma.paciente.findMany({
      where: { activo: true },
      include: { horarios: true },
    }),
    prisma.traslado.findMany({
      where: { fecha: { gte: inicio, lt: fin } },
      select: { pacienteId: true },
    }),
    prisma.pacienteCita.findMany({
      where: { fecha: { gte: inicio, lt: fin } },
    }),
  ]);

  const yaTienen = new Set(existentes.map((t) => t.pacienteId));
  const citaPorPaciente = new Map(citasHoy.map((c) => [c.pacienteId, c.horaCita]));

  for (const p of pacientes) {
    if (yaTienen.has(p.id)) continue;
    if (!p.choferAsignadoId) continue;

    const horaCita = citaPorPaciente.get(p.id) ?? p.horarios.find((h) => h.dia === diaSemana)?.horaCita;
    if (!horaCita) continue;

    for (let intento = 0; intento < 5; intento++) {
      try {
        const creado = await prisma.traslado.create({
          data: {
            codigo: generarCodigo(),
            fecha: inicio,
            horaCita,
            choferId: p.choferAsignadoId,
            choferRegresoId: p.choferVueltaId ?? p.choferAsignadoId,
            pacienteId: p.id,
            centroDestinoId: p.centroId,
          },
        });
        await registrarEvento({
          mensaje: `${p.nombre}: se generó automáticamente el traslado de hoy (turno ${horaCita})`,
          pacienteId: p.id,
          trasladoId: creado.id,
        });
        break;
      } catch (error) {
        const esColisionDeCodigo = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (!esColisionDeCodigo || intento === 4) throw error;
      }
    }
  }
}

/** Marca como EXPIRADO cualquier traslado del día que siga PENDIENTE y cuya hora de cita ya haya pasado. */
export async function expirarTrasladosVencidos(fecha: Date = new Date()) {
  const { inicio, fin } = rangoDia(fecha);
  const ahora = `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}`;

  const vencidos = await prisma.traslado.findMany({
    where: {
      fecha: { gte: inicio, lt: fin },
      estado: "PENDIENTE",
      horaCita: { lt: ahora },
    },
    include: { paciente: { select: { nombre: true } } },
  });

  for (const t of vencidos) {
    await prisma.traslado.update({ where: { id: t.id }, data: { estado: "EXPIRADO" } });
    await registrarEvento({
      mensaje: `${t.paciente.nombre}: el traslado expiró automáticamente sin confirmación (turno ${t.horaCita})`,
      pacienteId: t.pacienteId,
      trasladoId: t.id,
    });
  }
}
