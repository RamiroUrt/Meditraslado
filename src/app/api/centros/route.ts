import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";

export async function GET() {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const scopedCentroId = user.rol === "RECEPCIONISTA" ? user.centroId : null;

    const centros = await prisma.centro.findMany({
      where: scopedCentroId ? { id: scopedCentroId } : undefined,
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json({ centros });
  } catch (error) {
    console.error("GET /api/centros:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
