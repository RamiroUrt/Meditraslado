import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { registrarEvento } from "@/lib/eventos";
import type { Paciente } from "@/types/models";
import type { DiaSemana } from "@/generated/prisma/client";

interface PostBody {
  nombre: string;
  direccion: string;
  telefono: string;
  centroId: string;
  choferAsignadoId?: string | null;
  choferVueltaId?: string | null;
  duracionEstimadaMin?: number;
  activo?: boolean;
  requiereSillaDeRuedas?: boolean;
  observacion?: string | null;
  horarios?: { dia: string; horaCita: string }[];
}

export async function GET() {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const scopedCentroId = user.rol === "RECEPCIONISTA" ? user.centroId : null;

    const rows = await prisma.paciente.findMany({
      where: scopedCentroId ? { centroId: scopedCentroId } : undefined,
      orderBy: { nombre: "asc" },
      include: {
        centro: true,
        choferAsignado: { include: { usuario: true } },
        choferVuelta: { include: { usuario: true } },
        horarios: true,
      },
    });

    const pacientes: Paciente[] = rows.map((p) => ({
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
    }));

    return NextResponse.json({ pacientes });
  } catch (error) {
    console.error("GET /api/pacientes:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body: PostBody = await request.json();
    const centroId = user.rol === "RECEPCIONISTA" && user.centroId ? user.centroId : body.centroId;

    const p = await prisma.paciente.create({
      data: {
        nombre: body.nombre,
        direccion: body.direccion,
        telefono: body.telefono,
        centroId,
        choferAsignadoId: body.choferAsignadoId ?? null,
        choferVueltaId: body.choferVueltaId ?? null,
        duracionEstimadaMin: body.duracionEstimadaMin ?? 45,
        activo: body.activo ?? true,
        requiereSillaDeRuedas: body.requiereSillaDeRuedas ?? false,
        observacion: body.observacion ?? null,
        horarios: {
          create: (body.horarios ?? []).map((h) => ({
            dia: h.dia as DiaSemana,
            horaCita: h.horaCita,
          })),
        },
      },
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

    await registrarEvento({
      mensaje: `${p.nombre}: se agregó como nuevo paciente`,
      usuarioNombre: user.nombre,
      pacienteId: p.id,
    });

    return NextResponse.json({ paciente });
  } catch (error) {
    console.error("POST /api/pacientes:", error);
    return NextResponse.json({ error: "Error al crear el paciente" }, { status: 500 });
  }
}
