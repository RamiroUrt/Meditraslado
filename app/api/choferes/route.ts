import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import type { Chofer } from "@/lib/types";

export async function GET() {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const rows = await prisma.chofer.findMany({
      include: { usuario: true },
      orderBy: { usuario: { nombre: "asc" } },
    });

    const choferes: Chofer[] = rows.map((c) => ({ id: c.id, nombre: c.usuario.nombre }));

    return NextResponse.json({ choferes });
  } catch (error) {
    console.error("GET /api/choferes:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
