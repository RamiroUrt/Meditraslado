import type { Centro, Paciente, Traslado } from "@/types/models";

export interface WhatsAppContext {
  nombre: string;
  telefono: string;
  hora?: string;
  centro?: string;
}

export interface Plantilla {
  id: string;
  label: string;
  build: (ctx: WhatsAppContext) => string;
}

export interface WhatsAppModalProps {
  context: WhatsAppContext;
  onClose: () => void;
}

export interface TrasladoModalProps {
  traslado: Traslado | null;
  pacientes: Paciente[];
  pacientePreseleccionado?: Paciente;
  onClose: () => void;
  onSave: (traslado: Traslado) => void;
}

export interface PatientsModalProps {
  paciente: Paciente | null;
  centroInicial?: Centro;
  bloquearCentro?: boolean;
  onClose: () => void;
  onSave: (paciente: Omit<Paciente, "id">) => Promise<void>;
}
