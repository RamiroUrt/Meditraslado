// Tipos compartidos entre las API routes (app/api/**) y los componentes de UI.
// Las API routes mapean los resultados de Prisma a estos shapes exactos.

export type EstadoTraslado = "PENDIENTE" | "CONFIRMADO" | "CANCELADO" | "EXPIRADO";

export type DiaSemana =
  | "LUNES"
  | "MARTES"
  | "MIERCOLES"
  | "JUEVES"
  | "VIERNES"
  | "SABADO"
  | "DOMINGO";

export const DIA_ABREVIADO: Record<DiaSemana, string> = {
  LUNES: "LUN",
  MARTES: "MAR",
  MIERCOLES: "MIÉ",
  JUEVES: "JUE",
  VIERNES: "VIE",
  SABADO: "SÁB",
  DOMINGO: "DOM",
};

export interface Centro {
  id: string;
  nombre: string;
}

export interface Chofer {
  id: string;
  nombre: string;
}

export interface PacienteHorario {
  dia: DiaSemana;
  horaCita: string;
}

export interface Paciente {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  centro: Centro;
  choferAsignado: Chofer | null;
  choferVuelta: Chofer | null;
  duracionEstimadaMin: number;
  horarios: PacienteHorario[];
  activo: boolean;
  requiereSillaDeRuedas: boolean;
  observacion?: string;
}

export interface Traslado {
  id: string;
  codigo: string;
  fecha: string;
  horaCita: string;
  chofer: Chofer;
  estado: EstadoTraslado;
  choferRegreso: Chofer | null;
  idaCancelada: boolean;
  vueltaCancelada: boolean;
  paciente: Paciente;
  destino: string;
  centroDestino: Centro;
  observacion?: string;
}

export interface Evento {
  id: string;
  mensaje: string;
  usuarioNombre: string | null;
  paciente: { id: string; nombre: string } | null;
  createdAt: string;
}
