import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireSessionUser } from "@/lib/session";
import { registrarEvento } from "@/lib/eventos";
import {
  generarTrasladosDelDia,
  expirarTrasladosVencidos,
  generarCodigo,
  obtenerTrasladoMapeado,
} from "@/lib/traslados";
import type { EstadoTraslado, Traslado } from "@/lib/types";

function rangoHoy() {
  const inicio = new Date();
  inicio.setUTCHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setUTCDate(fin.getUTCDate() + 1);
  return { inicio, fin };
}

export async function GET() {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    await generarTrasladosDelDia();
    await expirarTrasladosVencidos();

    const { inicio, fin } = rangoHoy();
    const scopedCentroId = user.rol === "RECEPCIONISTA" ? user.centroId : null;

    const rows = await prisma.traslado.findMany({
      where: {
        fecha: { gte: inicio, lt: fin },
        ...(scopedCentroId ? { centroDestinoId: scopedCentroId } : {}),
      },
      orderBy: { horaCita: "asc" },
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

    const traslados: Traslado[] = rows.map((t) => ({
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
    }));

    return NextResponse.json({ traslados });
  } catch (error) {
    console.error("GET /api/traslados:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

interface PostBody {
  pacienteId: string;
  centroDestinoId: string;
  horaCita: string;
  choferId: string;
  choferRegresoId?: string | null;
  estado?: EstadoTraslado;
  observacion?: string | null;
}

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body: PostBody = await request.json();
    if (!body.pacienteId || !body.centroDestinoId || !body.horaCita || !body.choferId) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const { inicio, fin } = rangoHoy();

    const yaExiste = await prisma.traslado.findFirst({
      where: { pacienteId: body.pacienteId, fecha: { gte: inicio, lt: fin } },
      select: { id: true },
    });
    if (yaExiste) {
      return NextResponse.json({ error: "Este paciente ya tiene un traslado para hoy" }, { status: 409 });
    }

    let id: string | null = null;

    for (let intento = 0; intento < 5 && !id; intento++) {
      try {
        const creado = await prisma.traslado.create({
          data: {
            codigo: generarCodigo(),
            fecha: inicio,
            horaCita: body.horaCita,
            choferId: body.choferId,
            choferRegresoId: body.choferRegresoId ?? null,
            pacienteId: body.pacienteId,
            centroDestinoId: body.centroDestinoId,
            estado: body.estado ?? "PENDIENTE",
            observacion: body.observacion ?? null,
          },
        });
        id = creado.id;
      } catch (error) {
        const esColisionDeCodigo = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (!esColisionDeCodigo || intento === 4) throw error;
      }
    }

    const traslado = await obtenerTrasladoMapeado(id as string);

    await registrarEvento({
      mensaje: `${traslado.paciente.nombre}: se creó un traslado para hoy (turno ${traslado.horaCita})`,
      usuarioNombre: user.nombre,
      pacienteId: traslado.paciente.id,
      trasladoId: traslado.id,
    });

    return NextResponse.json({ traslado }, { status: 201 });
  } catch (error) {
    console.error("POST /api/traslados:", error);
    return NextResponse.json({ error: "Error al crear" }, { status: 500 });
  }
}
