import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { registrarEvento } from "@/lib/eventos";
import type { Paciente } from "@/types/models";
import type { DiaSemana } from "@/generated/prisma/client";

interface PatchBody {
  nombre?: string;
  direccion?: string;
  telefono?: string;
  centroId?: string;
  choferAsignadoId?: string | null;
  choferVueltaId?: string | null;
  duracionEstimadaMin?: number;
  activo?: boolean;
  requiereSillaDeRuedas?: boolean;
  observacion?: string | null;
  horarios?: { dia: string; horaCita: string }[];
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  try {
    const body: PatchBody = await request.json();

    const antes = await prisma.paciente.findUniqueOrThrow({ where: { id }, include: { horarios: true } });

    await prisma.paciente.update({
      where: { id },
      data: {
        nombre: body.nombre,
        direccion: body.direccion,
        telefono: body.telefono,
        centroId: body.centroId,
        choferAsignadoId: body.choferAsignadoId,
        choferVueltaId: body.choferVueltaId,
        duracionEstimadaMin: body.duracionEstimadaMin,
        activo: body.activo,
        requiereSillaDeRuedas: body.requiereSillaDeRuedas,
        observacion: body.observacion,
      },
    });

    if (body.horarios) {
      await prisma.pacienteHorario.deleteMany({ where: { pacienteId: id } });
      if (body.horarios.length > 0) {
        await prisma.pacienteHorario.createMany({
          data: body.horarios.map((h) => ({
            pacienteId: id,
            dia: h.dia as DiaSemana,
            horaCita: h.horaCita,
          })),
        });
      }
    }

    const p = await prisma.paciente.findUniqueOrThrow({
      where: { id },
      include: {
        centro: true,
        choferAsignado: { include: { usuario: true } },
        choferVuelta: { include: { usuario: true } },
        horarios: true,
      },
    });

    const paciente: Paciente = {
      id: p.id,
      nombre: p.nombre,
      direccion: p.direccion,
      telefono: p.telefono,
      centro: { id: p.centro.id, nombre: p.centro.nombre },
      choferAsignado: p.choferAsignado
        ? { id: p.choferAsignado.id, nombre: p.choferAsignado.usuario.nombre }
        : null,
      choferVuelta: p.choferVuelta ? { id: p.choferVuelta.id, nombre: p.choferVuelta.usuario.nombre } : null,
      duracionEstimadaMin: p.duracionEstimadaMin,
      horarios: p.horarios.map((h) => ({ dia: h.dia, horaCita: h.horaCita })),
      activo: p.activo,
      requiereSillaDeRuedas: p.requiereSillaDeRuedas,
      observacion: p.observacion ?? undefined,
    };

    const cambios: string[] = [];
    if (body.nombre !== undefined && body.nombre !== antes.nombre) cambios.push("nombre");
    if (body.direccion !== undefined && body.direccion !== antes.direccion) cambios.push("dirección");
    if (body.telefono !== undefined && body.telefono !== antes.telefono) cambios.push("teléfono");
    if (body.centroId !== undefined && body.centroId !== antes.centroId) cambios.push("centro");
    if (body.choferAsignadoId !== undefined && body.choferAsignadoId !== antes.choferAsignadoId) {
      cambios.push("chofer ida");
    }
    if (body.choferVueltaId !== undefined && body.choferVueltaId !== antes.choferVueltaId) {
      cambios.push("chofer vuelta");
    }
    if (
      body.duracionEstimadaMin !== undefined &&
      body.duracionEstimadaMin !== antes.duracionEstimadaMin
    ) {
      cambios.push("duración estimada del turno");
    }
    if (body.requiereSillaDeRuedas !== undefined && body.requiereSillaDeRuedas !== antes.requiereSillaDeRuedas) {
      cambios.push("silla de ruedas");
    }
    if (body.activo !== undefined && body.activo !== antes.activo) {
      cambios.push(body.activo ? "reactivado" : "desactivado");
    }
    if (body.horarios) {
      const antesHorarios = antes.horarios
        .map((h) => `${h.dia}:${h.horaCita}`)
        .sort()
        .join(",");
      const nuevosHorarios = body.horarios
        .map((h) => `${h.dia}:${h.horaCita}`)
        .sort()
        .join(",");
      if (antesHorarios !== nuevosHorarios) cambios.push("horarios");
    }

    if (cambios.length > 0) {
      await registrarEvento({
        mensaje: `${antes.nombre}: se actualizó ${cambios.join(", ")}`,
        usuarioNombre: user.nombre,
        pacienteId: id,
      });
    }

    return NextResponse.json({ paciente });
  } catch (error) {
    console.error("PATCH /api/pacientes/[id]:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.rol !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede eliminar pacientes" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const paciente = await prisma.paciente.findUniqueOrThrow({ where: { id } });

    await prisma.$transaction([
      prisma.pacienteHorario.deleteMany({ where: { pacienteId: id } }),
      prisma.pacienteCita.deleteMany({ where: { pacienteId: id } }),
      prisma.traslado.deleteMany({ where: { pacienteId: id } }),
      prisma.paciente.delete({ where: { id } }),
    ]);

    await registrarEvento({
      mensaje: `${paciente.nombre}: paciente eliminado`,
      usuarioNombre: user.nombre,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/pacientes/[id]:", error);
    return NextResponse.json({ error: "Error al eliminar el paciente" }, { status: 500 });
  }
}
