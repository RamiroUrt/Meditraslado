import { NextResponse } from "next/server";
import { enviarRecordatoriosAutomaticos } from "@/lib/notificaciones";

/** Valida que el request venga del scheduler (no de un usuario) usando CRON_SECRET en .env. */
function autorizado(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

function fechaDeQuery(url: URL) {
  const valor = url.searchParams.get("fecha");
  if (!valor) return new Date();
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return Number.isNaN(fecha.getTime()) ? new Date() : fecha;
}

async function ejecutar(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const fecha = fechaDeQuery(new URL(request.url));
    const resultado = await enviarRecordatoriosAutomaticos(fecha);
    return NextResponse.json({ ok: true, fecha: fecha.toISOString().slice(0, 10), ...resultado });
  } catch (error) {
    console.error("POST /api/cron/recordatorios:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return ejecutar(request);
}

export async function POST(request: Request) {
  return ejecutar(request);
}
