import type { Centro, Chofer, EstadoTraslado, Evento, Paciente, Traslado } from "@/types/models";

export interface TrasladoInput {
  pacienteId: string;
  centroDestinoId: string;
  horaCita: string;
  choferId: string;
  choferRegresoId?: string | null;
  estado?: EstadoTraslado;
  observacion?: string | null;
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Error de red");
  return data;
}

export async function fetchPacientes(): Promise<Paciente[]> {
  const res = await fetch("/api/pacientes");
  const data = await parseOrThrow<{ pacientes: Paciente[] }>(res);
  return data.pacientes;
}

export async function createPaciente(paciente: Omit<Paciente, "id">): Promise<Paciente> {
  const res = await fetch("/api/pacientes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre: paciente.nombre,
      direccion: paciente.direccion,
      telefono: paciente.telefono,
      centroId: paciente.centro.id,
      choferAsignadoId: paciente.choferAsignado?.id ?? null,
      choferVueltaId: paciente.choferVuelta?.id ?? null,
      duracionEstimadaMin: paciente.duracionEstimadaMin,
      activo: paciente.activo,
      requiereSillaDeRuedas: paciente.requiereSillaDeRuedas,
      observacion: paciente.observacion ?? null,
      horarios: paciente.horarios,
    }),
  });
  const data = await parseOrThrow<{ paciente: Paciente }>(res);
  return data.paciente;
}

export async function updatePaciente(id: string, paciente: Paciente): Promise<Paciente> {
  const res = await fetch(`/api/pacientes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre: paciente.nombre,
      direccion: paciente.direccion,
      telefono: paciente.telefono,
      centroId: paciente.centro.id,
      choferAsignadoId: paciente.choferAsignado?.id ?? null,
      choferVueltaId: paciente.choferVuelta?.id ?? null,
      duracionEstimadaMin: paciente.duracionEstimadaMin,
      activo: paciente.activo,
      requiereSillaDeRuedas: paciente.requiereSillaDeRuedas,
      observacion: paciente.observacion ?? null,
      horarios: paciente.horarios,
    }),
  });
  const data = await parseOrThrow<{ paciente: Paciente }>(res);
  return data.paciente;
}

export async function deletePaciente(id: string): Promise<void> {
  const res = await fetch(`/api/pacientes/${id}`, { method: "DELETE" });
  await parseOrThrow<{ ok: true }>(res);
}

export async function fetchTraslados(desde?: string, hasta?: string): Promise<Traslado[]> {
  const params = new URLSearchParams();
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  const query = params.toString();
  const res = await fetch(`/api/traslados${query ? `?${query}` : ""}`);
  const data = await parseOrThrow<{ traslados: Traslado[] }>(res);
  return data.traslados;
}

export async function createTraslado(data: TrasladoInput): Promise<Traslado> {
  const res = await fetch("/api/traslados", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await parseOrThrow<{ traslado: Traslado }>(res);
  return result.traslado;
}

export async function updateTraslado(
  id: string,
  cambios: Partial<TrasladoInput> & { idaCancelada?: boolean; vueltaCancelada?: boolean },
): Promise<Traslado> {
  const res = await fetch(`/api/traslados/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cambios),
  });
  const data = await parseOrThrow<{ traslado: Traslado }>(res);
  return data.traslado;
}

export async function enviarWhatsApp(datos: {
  telefono: string;
  nombre: string;
  plantillaId: string;
  mensaje: string;
  hora?: string;
  centro?: string;
}): Promise<void> {
  const res = await fetch("/api/whatsapp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  await parseOrThrow<{ ok: true }>(res);
}

export async function fetchCentros(): Promise<Centro[]> {
  const res = await fetch("/api/centros");
  const data = await parseOrThrow<{ centros: Centro[] }>(res);
  return data.centros;
}

export async function fetchChoferes(): Promise<Chofer[]> {
  const res = await fetch("/api/choferes");
  const data = await parseOrThrow<{ choferes: Chofer[] }>(res);
  return data.choferes;
}

export async function fetchEventos(soloHoy = false): Promise<Evento[]> {
  const res = await fetch(`/api/eventos${soloHoy ? "?hoy=1" : ""}`);
  const data = await parseOrThrow<{ eventos: Evento[] }>(res);
  return data.eventos;
}

export async function cambiarPassword(passwordActual: string, passwordNueva: string): Promise<void> {
  const res = await fetch("/api/account/password", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passwordActual, passwordNueva }),
  });
  await parseOrThrow<{ ok: true }>(res);
}

interface PerfilResult {
  nombre: string;
  email: string;
  fotoUrl: string | null;
}

export async function fetchPerfil(): Promise<{ fotoUrl: string | null }> {
  const res = await fetch("/api/account/profile");
  return parseOrThrow<{ fotoUrl: string | null }>(res);
}

export async function actualizarPerfil(
  nombre: string,
  email: string,
  fotoUrl?: string | null,
): Promise<PerfilResult> {
  const res = await fetch("/api/account/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, email, fotoUrl }),
  });
  return parseOrThrow<PerfilResult>(res);
}
