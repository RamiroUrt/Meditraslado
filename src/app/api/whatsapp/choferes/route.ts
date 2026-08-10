import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/session";
import { notificarRutasChoferes } from "@/lib/notificaciones";

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.rol === "CHOFER") {
    return NextResponse.json({ error: "Solo administración o recepción pueden enviar rutas" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const fecha = body.fecha ? new Date(body.fecha) : new Date();
    const resultado = await notificarRutasChoferes(fecha, user.nombre);
    return NextResponse.json(resultado);
  } catch (error) {
    console.error("POST /api/whatsapp/choferes:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron enviar las rutas" },
      { status: 502 },
    );
  }
}
