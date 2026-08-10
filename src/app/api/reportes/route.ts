import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";

function rangoDeFechas(desde?: string | null, hasta?: string | null) {
  const inicio = new Date(`${desde ?? "2020-01-01"}T00:00:00.000Z`);
  const finAux = new Date(`${hasta ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  const fin = new Date(finAux);
  fin.setUTCDate(fin.getUTCDate() + 1);
  return { inicio, fin };
}

function estadoLabel(estado: string) {
  return (
    { PENDIENTE: "Pendiente", CONFIRMADO: "Confirmado", CANCELADO: "Cancelado", EXPIRADO: "Expirado" }[estado] ??
    estado
  );
}

export async function GET(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.rol === "CHOFER") {
    return NextResponse.json({ error: "Solo administración o recepción pueden ver reportes" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") ?? "traslados";

    if (user.rol !== "ADMIN" && tipo === "eventos") {
      return NextResponse.json({ error: "La auditoría es exclusiva de administración" }, { status: 403 });
    }

    const centroId =
      user.rol === "RECEPCIONISTA" && user.centroId
        ? user.centroId
        : searchParams.get("centroId") || undefined;

    const { inicio, fin } = rangoDeFechas(searchParams.get("desde"), searchParams.get("hasta"));

    if (tipo === "pacientes") {
      const filas = await prisma.paciente.findMany({
        where: centroId ? { centroId } : undefined,
        orderBy: { nombre: "asc" },
        include: {
          centro: true,
          choferAsignado: { include: { usuario: true } },
          choferVuelta: { include: { usuario: true } },
          horarios: true,
        },
      });

      const resultados = filas.map((p) => ({
        nombre: p.nombre,
        direccion: p.direccion,
        telefono: p.telefono,
        centro: p.centro.nombre,
        choferIda: p.choferAsignado?.usuario.nombre ?? "",
        choferVuelta: p.choferVuelta?.usuario.nombre ?? "",
        duracionMin: p.duracionEstimadaMin,
        activo: p.activo ? "Sí" : "No",
        sillaDeRuedas: p.requiereSillaDeRuedas ? "Sí" : "No",
        dias: p.horarios.map((h) => h.dia).join(", "),
        observacion: p.observacion ?? "",
      }));
      return NextResponse.json({ tipo, filas: resultados });
    }

    if (tipo === "eventos") {
      const eventos = await prisma.evento.findMany({
        where: {
          createdAt: { gte: inicio, lt: fin },
          ...(centroId ? { paciente: { centroId } } : {}),
        },
        orderBy: { createdAt: "asc" },
        include: { paciente: { include: { centro: true } } },
      });

      const filas = eventos.map((e) => ({
        fechaHora: e.createdAt.toISOString(),
        usuario: e.usuarioNombre ?? "Sistema",
        mensaje: e.mensaje,
        paciente: e.paciente?.nombre ?? "",
        centro: e.paciente?.centro.nombre ?? "",
      }));
      return NextResponse.json({ tipo, filas });
    }

    if (tipo === "choferes") {
      const traslados = await prisma.traslado.findMany({
        where: { fecha: { gte: inicio, lt: fin }, ...(centroId ? { centroDestinoId: centroId } : {}) },
        orderBy: { fecha: "asc" },
        include: { paciente: true, chofer: { include: { usuario: true } }, choferRegreso: { include: { usuario: true } } },
      });

      const filas: Record<string, string | number>[] = [];
      for (const t of traslados) {
        const fecha = t.fecha.toISOString().slice(0, 10);
        if (!t.idaCancelada) {
          filas.push({
            chofer: t.chofer.usuario.nombre,
            fecha,
            horaCita: t.horaCita,
            paciente: t.paciente.nombre,
            tramo: "Ida",
            estado: estadoLabel(t.estado),
          });
        }
        if (t.choferRegreso && !t.vueltaCancelada) {
          filas.push({
            chofer: t.choferRegreso.usuario.nombre,
            fecha,
            horaCita: t.horaCita,
            paciente: t.paciente.nombre,
            tramo: t.choferRegresoId === t.choferId ? "Ida + vuelta" : "Vuelta",
            estado: estadoLabel(t.estado),
          });
        }
      }
      filas.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
      return NextResponse.json({ tipo, filas });
    }

    // default: traslados
    const traslados = await prisma.traslado.findMany({
      where: { fecha: { gte: inicio, lt: fin }, ...(centroId ? { centroDestinoId: centroId } : {}) },
      orderBy: [{ fecha: "asc" }, { horaCita: "asc" }],
      include: {
        paciente: true,
        centroDestino: true,
        chofer: { include: { usuario: true } },
        choferRegreso: { include: { usuario: true } },
      },
    });

    const filas = traslados.map((t) => ({
      fecha: t.fecha.toISOString().slice(0, 10),
      horaCita: t.horaCita,
      codigo: t.codigo,
      paciente: t.paciente.nombre,
      telefono: t.paciente.telefono,
      destino: t.centroDestino.nombre,
      choferIda: t.chofer.usuario.nombre,
      choferVuelta: t.choferRegreso?.usuario.nombre ?? "",
      estado: estadoLabel(t.estado),
      idaCancelada: t.idaCancelada ? "Sí" : "No",
      vueltaCancelada: t.vueltaCancelada ? "Sí" : "No",
      observacion: t.observacion ?? "",
    }));

    return NextResponse.json({ tipo, filas });
  } catch (error) {
    console.error("GET /api/reportes:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
