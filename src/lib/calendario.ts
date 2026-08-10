import type { DiaSemana } from "@/types/models";

export const DIAS: DiaSemana[] = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];

export const DIA_LABEL: Record<DiaSemana, string> = {
  LUNES: "Lunes",
  MARTES: "Martes",
  MIERCOLES: "Miércoles",
  JUEVES: "Jueves",
  VIERNES: "Viernes",
  SABADO: "Sábado",
  DOMINGO: "Domingo",
};

export const START_HOUR = 7;
export const END_HOUR = 20;

export function generarSlots() {
  const slots: string[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

export const SLOTS = generarSlots();

export function slotDe(horaCita: string) {
  const [h, m] = horaCita.split(":").map(Number);
  const totalMin = Math.floor((h * 60 + m) / 15) * 15;
  const sh = Math.floor(totalMin / 60);
  const sm = totalMin % 60;
  return `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;
}

export function sumarMinutos(horaCita: string, minutos: number) {
  const [h, m] = horaCita.split(":").map(Number);
  const total = h * 60 + m + minutos;
  const sh = Math.floor(total / 60);
  const sm = total % 60;
  return `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;
}

export function isoFecha(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function inicioDeSemana(fecha = new Date()) {
  const d = new Date(fecha);
  const getDay = d.getDay();
  const diff = getDay === 0 ? -6 : 1 - getDay;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface DiaSemanaConFecha {
  dia: DiaSemana;
  fecha: string;
}

export function semanaActual(fecha = new Date()): DiaSemanaConFecha[] {
  const lunes = inicioDeSemana(fecha);
  return DIAS.map((dia, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return { dia, fecha: isoFecha(d) };
  });
}
