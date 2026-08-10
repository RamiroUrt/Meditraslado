import { prisma } from "@/lib/prisma";
import { enviarPlantilla, enviarTexto } from "@/lib/whatsapp";
import { registrarEvento } from "@/lib/eventos";
import { expirarTrasladosVencidos, generarTrasladosDelDia, rangoDia } from "@/lib/traslados";

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  CANCELADO: "Cancelado",
  EXPIRADO: "Expirado",
};

function formatearFecha(fecha: Date) {
  return `${String(fecha.getUTCDate()).padStart(2, "0")}/${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Agrupa los traslados del día por chofer (ida y vuelta) y le envía a cada uno su ruta por WhatsApp. */
export async function notificarRutasChoferes(fecha: Date = new Date(), usuarioNombre?: string) {
  await generarTrasladosDelDia(fecha);
  await expirarTrasladosVencidos(fecha);

  const { inicio, fin } = rangoDia(fecha);
  const traslados = await prisma.traslado.findMany({
    where: { fecha: { gte: inicio, lt: fin } },
    orderBy: { horaCita: "asc" },
    include: {
      chofer: { include: { usuario: true } },
      choferRegreso: { include: { usuario: true } },
      centroDestino: true,
      paciente: true,
    },
  });

  type RutaChofer = { id: string; nombre: string; telefono: string | null; tramos: string[] };
  const rutas = new Map<string, RutaChofer>();

  for (const t of traslados) {
    const estado = ESTADO_LABEL[t.estado] ?? t.estado;
    const base = `${t.horaCita} — ${t.paciente.nombre}, ${t.paciente.direccion} → ${t.centroDestino.nombre} (${estado})${
      t.paciente.requiereSillaDeRuedas ? " 🦽" : ""
    }`;

    const agregarTramo = (chofer: { id: string; nombre: string }, telefono: string | null, tramo: string) => {
      const actual = rutas.get(chofer.id) ?? {
        id: chofer.id,
        nombre: chofer.nombre,
        telefono,
        tramos: [],
      };
      actual.tramos.push(`${tramo}: ${base}`);
      rutas.set(chofer.id, actual);
    };

    if (!t.idaCancelada) {
      agregarTramo(
        { id: t.chofer.id, nombre: t.chofer.usuario.nombre },
        t.chofer.telefonoAlternativo ?? null,
        "Ida",
      );
    }
    if (t.choferRegreso && !t.vueltaCancelada) {
      agregarTramo(
        { id: t.choferRegreso.id, nombre: t.choferRegreso.usuario.nombre },
        t.choferRegreso.telefonoAlternativo ?? null,
        t.choferRegresoId === t.choferId ? "Ida + vuelta" : "Vuelta",
      );
    }
  }

  const enviados: string[] = [];
  const sinTelefono: string[] = [];
  const errores: { chofer: string; error: string }[] = [];

  for (const ruta of rutas.values()) {
    if (!ruta.telefono) {
      sinTelefono.push(ruta.nombre);
      continue;
    }

    const mensaje = [
      `Hola ${ruta.nombre}, esta es tu ruta de hoy ${formatearFecha(fecha)}:`,
      "",
      ...ruta.tramos.map((linea) => `• ${linea}`),
    ].join("\n");

    try {
      // Texto libre: para el equipo propio conviene que el chofer haya tenido contacto previo
      // (ventana de 24hs) o aprobar una plantilla dedicada (p. ej. "ruta_diaria").
      await enviarTexto(ruta.telefono, mensaje);
      await registrarEvento({
        mensaje: `${ruta.nombre}: se envió WhatsApp con su ruta del día (${ruta.tramos.length} tramos)`,
        usuarioNombre: usuarioNombre ?? "Sistema",
      });
      enviados.push(ruta.nombre);
    } catch (error) {
      errores.push({ chofer: ruta.nombre, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { enviados, sinTelefono, errores, totalChoferes: rutas.size };
}

/**
 * Envía el recordatorio del día a los pacientes con traslado PENDIENTE. Usa la plantilla aprobada
 * de Meta (necesaria para iniciar conversación fuera de la ventana de 24hs). Idempotente: registra
 * un Evento por traslado y no vuelve a enviar si ya se envió hoy.
 */
export async function enviarRecordatoriosAutomaticos(fecha: Date = new Date()) {
  await generarTrasladosDelDia(fecha);
  await expirarTrasladosVencidos(fecha);

  const { inicio, fin } = rangoDia(fecha);
  const traslados = await prisma.traslado.findMany({
    where: { fecha: { gte: inicio, lt: fin }, estado: "PENDIENTE" },
    include: {
      paciente: { select: { id: true, nombre: true, telefono: true, centro: { select: { nombre: true } } } },
    },
  });

  const trasladoIds = traslados.map((t) => t.id);
  const yaEnviados = new Set(
    (
      await prisma.evento.findMany({
        where: {
          createdAt: { gte: inicio, lt: fin },
          trasladoId: { in: trasladoIds },
          mensaje: { startsWith: "Recordatorio de traslado enviado" },
        },
        select: { trasladoId: true },
      })
    ).map((e) => e.trasladoId),
  );

  const enviados: string[] = [];
  const sinTelefono: string[] = [];
  const errores: { paciente: string; error: string }[] = [];

  for (const t of traslados) {
    if (yaEnviados.has(t.id)) continue;
    if (!t.paciente.telefono) {
      sinTelefono.push(t.paciente.nombre);
      continue;
    }

    try {
      await enviarPlantilla(t.paciente.telefono, "recordatorio_traslado", [
        t.paciente.nombre,
        t.horaCita,
        t.paciente.centro.nombre,
      ]);
      await registrarEvento({
        mensaje: `Recordatorio de traslado enviado a ${t.paciente.nombre} (turno ${t.horaCita})`,
        pacienteId: t.paciente.id,
        trasladoId: t.id,
      });
      enviados.push(t.paciente.nombre);
    } catch (error) {
      errores.push({ paciente: t.paciente.nombre, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { enviados, sinTelefono, errores, totalPendientes: traslados.length };
}
