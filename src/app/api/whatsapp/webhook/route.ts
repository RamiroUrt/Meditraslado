import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarEvento } from "@/lib/eventos";
import { rangoDia } from "@/lib/traslados";
import { enviarTexto } from "@/lib/whatsapp";

const PALABRAS_CONFIRMAR = ["si", "1", "confirmar", "confirmo"];
const PALABRAS_CANCELAR = ["no", "2", "cancelar", "cancelo"];
const ACENTOS: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u" };

function normalizarTelefono(waId: string) {
  return `+${waId.replace(/^\+/, "")}`;
}

function normalizarTexto(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .replace(/[áéíóú]/g, (letra) => ACENTOS[letra]);
}

function firmaValida(rawBody: string, firmaHeader: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !firmaHeader) return false;

  const esperada = createHmac("sha256", secret).update(rawBody).digest("hex");
  const recibida = firmaHeader.replace(/^sha256=/, "");

  const bufEsperada = Buffer.from(esperada, "hex");
  const bufRecibida = Buffer.from(recibida, "hex");
  if (bufEsperada.length !== bufRecibida.length) return false;
  return timingSafeEqual(bufEsperada, bufRecibida);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verificación fallida" }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!firmaValida(rawBody, request.headers.get("x-hub-signature-256"))) {
    console.error("POST /api/whatsapp/webhook: firma inválida");
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const mensaje = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!mensaje?.from || !mensaje?.text?.body) {
      return NextResponse.json({ ok: true });
    }

    const telefono = normalizarTelefono(mensaje.from);
    const texto = normalizarTexto(mensaje.text.body);

    const paciente = await prisma.paciente.findFirst({ where: { telefono } });
    if (!paciente) return NextResponse.json({ ok: true });

    const { inicio, fin } = rangoDia(new Date());
    const traslado = await prisma.traslado.findFirst({
      where: { pacienteId: paciente.id, fecha: { gte: inicio, lt: fin } },
    });
    if (!traslado) return NextResponse.json({ ok: true });

    let nuevoEstado: "CONFIRMADO" | "CANCELADO" | null = null;
    if (PALABRAS_CONFIRMAR.includes(texto)) nuevoEstado = "CONFIRMADO";
    else if (PALABRAS_CANCELAR.includes(texto)) nuevoEstado = "CANCELADO";

    if (!nuevoEstado) return NextResponse.json({ ok: true });

    await prisma.traslado.update({ where: { id: traslado.id }, data: { estado: nuevoEstado } });
    await registrarEvento({
      mensaje: `${paciente.nombre}: ${nuevoEstado === "CONFIRMADO" ? "confirmó" : "canceló"} su traslado por WhatsApp`,
      pacienteId: paciente.id,
      trasladoId: traslado.id,
    });

    const acuse =
      nuevoEstado === "CONFIRMADO"
        ? `Listo ${paciente.nombre}, quedó confirmado. ¡Te esperamos!`
        : `Listo ${paciente.nombre}, quedó cancelado. Gracias por avisar.`;
    await enviarTexto(paciente.telefono, acuse).catch((err) => {
      console.error("No se pudo enviar el acuse de WhatsApp:", err);
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/whatsapp/webhook:", error);
    return NextResponse.json({ ok: true });
  }
}
