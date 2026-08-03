import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireSessionUser } from "@/lib/session";
import type { Evento } from "@/types/models";

export async function GET(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const soloHoy = searchParams.get("hoy") === "1";
    const scopedCentroId = user.rol === "RECEPCIONISTA" ? user.centroId : null;

    const where: Prisma.EventoWhereInput = {};

    if (soloHoy) {
      const inicio = new Date();
      inicio.setUTCHours(0, 0, 0, 0);
      const fin = new Date(inicio);
      fin.setUTCDate(fin.getUTCDate() + 1);
      where.createdAt = { gte: inicio, lt: fin };
    }

    if (scopedCentroId) {
      where.paciente = { centroId: scopedCentroId };
    }

    const rows = await prisma.evento.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: soloHoy ? undefined : 200,
      include: { paciente: { select: { id: true, nombre: true } } },
    });

    const eventos: Evento[] = rows.map((e) => ({
      id: e.id,
      mensaje: e.mensaje,
      usuarioNombre: e.usuarioNombre,
      paciente: e.paciente ? { id: e.paciente.id, nombre: e.paciente.nombre } : null,
      createdAt: e.createdAt.toISOString(),
    }));

    return NextResponse.json({ eventos });
  } catch (error) {
    console.error("GET /api/eventos:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
