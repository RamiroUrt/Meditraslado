import type { Traslado } from "@/types/models";

export interface CentroConteo {
  id: string;
  nombre: string;
  cantidad: number;
}

export interface StatsHoy {
  confirmados: number;
  pendientes: number;
  cancelados: number;
  expirados: number;
  pacientesActivos: number;
  pacientesPorCentro: CentroConteo[];
}

export interface TransferDetailProps {
  transfer: Traslado | null;
  onWhatsappClick?: () => void;
  onModificarClick?: () => void;
  onToggleIda?: () => void;
  onToggleVuelta?: () => void;
}

export interface TransferListProps {
  transfers: Traslado[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}
