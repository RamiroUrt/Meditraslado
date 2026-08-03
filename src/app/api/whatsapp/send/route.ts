import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/session";
import { registrarEvento } from "@/lib/eventos";
import { enviarPlantilla, enviarTexto } from "@/lib/whatsapp";

const PLANTILLA_LABEL: Record<string, string> = {
  recordatorio: "recordatorio de traslado",
  confirmacion: "confirmación de traslado",
  cancelacion: "cancelación de traslado",
  demora: "aviso de demora",
};

// Nombre exacto con el que la plantilla quedó aprobada en el Administrador de WhatsApp de Meta.
const PLANTILLA_META_NOMBRE: Record<string, string> = {
  recordatorio: "recordatorio_traslado",
};

interface PostBody {
  telefono: string;
  nombre: string;
  plantillaId: string;
  mensaje: string;
  hora?: string;
  centro?: string;
}

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body: PostBody = await request.json();
    if (!body.telefono || !body.plantillaId) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const nombreMeta = PLANTILLA_META_NOMBRE[body.plantillaId];
    if (nombreMeta) {
      await enviarPlantilla(body.telefono, nombreMeta, [body.nombre, body.hora ?? "-", body.centro ?? "-"]);
    } else {
      await enviarTexto(body.telefono, body.mensaje);
    }

    const label = PLANTILLA_LABEL[body.plantillaId] ?? body.plantillaId;
    await registrarEvento({
      mensaje: `${body.nombre}: se envió WhatsApp (${label})`,
      usuarioNombre: user.nombre,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/whatsapp/send:", error);
    const mensaje = error instanceof Error ? error.message : "No se pudo enviar el mensaje";
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }
}
