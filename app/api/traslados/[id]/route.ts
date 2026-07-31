import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { registrarEvento } from "@/lib/eventos";
import { obtenerTrasladoMapeado } from "@/lib/traslados";
import type { EstadoTraslado } from "@/lib/types";

const ESTADO_LABEL: Record<EstadoTraslado, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  CANCELADO: "Cancelado",
  EXPIRADO: "Expirado",
};

interface PatchBody {
  pacienteId?: string;
  centroDestinoId?: string;
  horaCita?: string;
  choferId?: string;
  choferRegresoId?: string | null;
  estado?: EstadoTraslado;
  observacion?: string | null;
  idaCancelada?: boolean;
  vueltaCancelada?: boolean;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  try {
    const body: PatchBody = await request.json();

    const actual = await prisma.traslado.findUniqueOrThrow({ where: { id } });
    const idaCancelada = body.idaCancelada ?? actual.idaCancelada;
    const vueltaCancelada = body.vueltaCancelada ?? actual.vueltaCancelada;

    // Si se cancelan ambos tramos, el traslado completo queda cancelado.
    // Si se reactiva alguno estando el traslado cancelado por esta misma regla, vuelve a quedar pendiente.
    // Un estado elegido explícitamente en el modal de edición tiene prioridad, salvo que ambos tramos queden cancelados.
    let estado = body.estado ?? actual.estado;
    if (idaCancelada && vueltaCancelada) {
      estado = "CANCELADO";
    } else if (body.estado === undefined && actual.estado === "CANCELADO") {
      estado = "PENDIENTE";
    }

    await prisma.traslado.update({
      where: { id },
      data: {
        pacienteId: body.pacienteId,
        centroDestinoId: body.centroDestinoId,
        horaCita: body.horaCita,
        choferId: body.choferId,
        choferRegresoId: body.choferRegresoId,
        observacion: body.observacion,
        idaCancelada,
        vueltaCancelada,
        estado,
      },
    });

    const traslado = await obtenerTrasladoMapeado(id);

    const cambios: string[] = [];
    if (body.idaCancelada !== undefined && body.idaCancelada !== actual.idaCancelada) {
      cambios.push(body.idaCancelada ? "se canceló el tramo de ida" : "se reactivó el tramo de ida");
    }
    if (body.vueltaCancelada !== undefined && body.vueltaCancelada !== actual.vueltaCancelada) {
      cambios.push(body.vueltaCancelada ? "se canceló el tramo de vuelta" : "se reactivó el tramo de vuelta");
    }
    if (body.horaCita !== undefined && body.horaCita !== actual.horaCita) {
      cambios.push(`horario cambiado a ${body.horaCita}`);
    }
    if (body.choferId !== undefined && body.choferId !== actual.choferId) {
      cambios.push("chofer de ida cambiado");
    }
    if (body.choferRegresoId !== undefined && body.choferRegresoId !== actual.choferRegresoId) {
      cambios.push("chofer de vuelta cambiado");
    }
    if (body.centroDestinoId !== undefined && body.centroDestinoId !== actual.centroDestinoId) {
      cambios.push("centro de destino cambiado");
    }
    if (body.pacienteId !== undefined && body.pacienteId !== actual.pacienteId) {
      cambios.push("paciente reasignado");
    }
    if (estado !== actual.estado) {
      cambios.push(`estado cambiado a ${ESTADO_LABEL[estado]}`);
    }

    if (cambios.length > 0) {
      await registrarEvento({
        mensaje: `${traslado.paciente.nombre}: ${cambios.join("; ")}`,
        usuarioNombre: user.nombre,
        pacienteId: traslado.paciente.id,
        trasladoId: traslado.id,
      });
    }

    return NextResponse.json({ traslado });
  } catch (error) {
    console.error("PATCH /api/traslados/[id]:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}
