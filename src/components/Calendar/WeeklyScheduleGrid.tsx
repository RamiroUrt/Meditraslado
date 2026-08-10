"use client";

import { useState, type MouseEvent } from "react";
import { MapPin, Phone, Car, Building2, AlertTriangle, LogIn, LogOut } from "lucide-react";
import { DIAS, DIA_LABEL, SLOTS, slotDe, sumarMinutos } from "@/lib/calendario";
import type { DiaSemana } from "@/types/models";
import type { CeldaItem, HoverInfo, Tramo, WeeklyScheduleGridProps } from "@/types/calendar";

const POPOVER_WIDTH = 260;

function abreviarCentro(nombre: string) {
  const palabras = nombre.trim().split(/\s+/);
  if (palabras.length > 1) {
    return palabras.map((w) => w[0]).join("").toUpperCase().slice(0, 3);
  }
  return nombre.slice(0, 3).toUpperCase();
}

const TRAMO_LABEL: Record<Tramo, string> = {
  entrada: "Entrada",
  salida: "Salida",
};

export default function WeeklyScheduleGrid({ pacientes, choferIdActivo }: WeeklyScheduleGridProps) {
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const celdas = new Map<string, CeldaItem[]>();
  function agregar(dia: DiaSemana, horaCita: string, item: CeldaItem) {
    const key = `${dia}|${slotDe(horaCita)}`;
    const lista = celdas.get(key) ?? [];
    lista.push(item);
    celdas.set(key, lista);
  }

  pacientes.forEach((p) => {
    p.horarios.forEach((h) => {
      if (!choferIdActivo) {
        agregar(h.dia, h.horaCita, { paciente: p, horaCita: h.horaCita });
        return;
      }

      const esIda = p.choferAsignado?.id === choferIdActivo;
      const esVuelta = (p.choferVuelta?.id ?? p.choferAsignado?.id) === choferIdActivo;

      if (esIda) {
        agregar(h.dia, h.horaCita, { paciente: p, horaCita: h.horaCita, tramo: "entrada" });
      }
      if (esVuelta) {
        const horaSalida = sumarMinutos(h.horaCita, p.duracionEstimadaMin);
        agregar(h.dia, horaSalida, { paciente: p, horaCita: horaSalida, tramo: "salida" });
      }
    });
  });

  function handleEnter(e: MouseEvent<HTMLSpanElement>, item: CeldaItem, dia: DiaSemana) {
    const rect = e.currentTarget.getBoundingClientRect();
    const left = Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 16);
    setHover({ item, dia, top: rect.bottom + 6, left: Math.max(8, left) });
  }

  function handleTap(e: MouseEvent<HTMLSpanElement>, item: CeldaItem, dia: DiaSemana) {
    e.stopPropagation();
    handleEnter(e, item, dia);
  }

  return (
    <div className="week-grid-wrap" onClick={() => setHover(null)}>
      <table className="week-grid">
        <thead>
          <tr>
            <th className="week-grid-hour-header">Hora</th>
            {DIAS.map((d) => (
              <th key={d}>{DIA_LABEL[d]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SLOTS.map((slot, i) => (
            <tr key={slot} className={i % 2 === 1 ? "week-grid-row--alt" : undefined}>
              <td className="week-grid-hour">{slot}</td>
              {DIAS.map((dia) => {
                const items = celdas.get(`${dia}|${slot}`) ?? [];
                return (
                  <td key={dia} className="week-grid-cell">
                    {items.map((item) => {
                      const TramoIcon = item.tramo === "salida" ? LogOut : item.tramo === "entrada" ? LogIn : null;
                      return (
                        <span
                          key={`${item.paciente.id}-${item.tramo ?? ""}`}
                          className={`week-grid-patient${item.tramo ? ` week-grid-patient--${item.tramo}` : ""}`}
                          onMouseEnter={(e) => handleEnter(e, item, dia)}
                          onMouseLeave={() => setHover(null)}
                          onClick={(e) => handleTap(e, item, dia)}
                        >
                          {TramoIcon && (
                            <TramoIcon
                              size={11}
                              className={`week-grid-patient-icon${item.tramo === "salida" ? " week-grid-patient-icon--salida" : ""}`}
                            />
                          )}
                          {item.paciente.nombre}
                          {item.tramo && (
                            <span className="week-grid-patient-centro">
                              {abreviarCentro(item.paciente.centro.nombre)}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {hover && (
        <div className="week-grid-popover" style={{ top: hover.top, left: hover.left, width: POPOVER_WIDTH }}>
          <div className="week-grid-popover-nombre">{hover.item.paciente.nombre}</div>
          <div className="week-grid-popover-turno">
            {DIA_LABEL[hover.dia]} · {hover.item.horaCita}
            {hover.item.tramo && ` · ${TRAMO_LABEL[hover.item.tramo]}`}
          </div>

          <div className="week-grid-popover-row">
            <Building2 size={13} />
            {hover.item.paciente.centro.nombre}
          </div>
          <div className="week-grid-popover-row">
            <MapPin size={13} />
            {hover.item.paciente.direccion}
          </div>
          <div className="week-grid-popover-row">
            <Phone size={13} />
            {hover.item.paciente.telefono}
          </div>
          <div className="week-grid-popover-row">
            <Car size={13} />
            {hover.item.tramo === "salida"
              ? (hover.item.paciente.choferVuelta?.nombre ?? hover.item.paciente.choferAsignado?.nombre ?? "Sin chofer asignado")
              : (hover.item.paciente.choferAsignado?.nombre ?? "Sin chofer asignado")}
          </div>

          {hover.item.paciente.requiereSillaDeRuedas && (
            <div className="week-grid-popover-row week-grid-popover-row--alerta">
              <AlertTriangle size={13} />
              Requiere silla de ruedas
            </div>
          )}

          {hover.item.paciente.observacion && (
            <div className="week-grid-popover-observacion">{hover.item.paciente.observacion}</div>
          )}
        </div>
      )}
    </div>
  );
}
