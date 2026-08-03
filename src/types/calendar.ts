import type { DiaSemana, Paciente } from "@/types/models";

export type Tramo = "entrada" | "salida";

export interface CeldaItem {
  paciente: Paciente;
  horaCita: string;
  tramo?: Tramo;
}

export interface HoverInfo {
  item: CeldaItem;
  dia: DiaSemana;
  top: number;
  left: number;
}

export interface WeeklyScheduleGridProps {
  pacientes: Paciente[];
  choferIdActivo?: string;
}
