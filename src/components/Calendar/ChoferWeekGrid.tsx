"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { MapPin, Phone, Car, Building2, AlertTriangle, LogIn, LogOut, X } from "lucide-react";
import Badge from "@/components/ui/Badge/Badge";
import { DIA_LABEL, SLOTS, slotDe, sumarMinutos, type DiaSemanaConFecha } from "@/lib/calendario";
import type { DiaSemana, Traslado } from "@/types/models";
import type { Tramo } from "@/types/calendar";

const POPOVER_WIDTH = 280;

interface ChoferWeekGridProps {
  traslados: Traslado[];
  dias: DiaSemanaConFecha[];
  choferId: string;
}

interface Chip {
  key: string;
  traslado: Traslado;
  tramo: Tramo;
  horaCita: string;
  cancelado: boolean;
}

interface HoverChofer {
  chip: Chip;
  dia: DiaSemana;
  top: number;
  left: number;
}

function tramoChip(traslado: Traslado, tramo: Tramo, choferId: string): Chip | null {
  if (tramo === "entrada") {
    if (traslado.chofer.id !== choferId) return null;
    return {
      key: `${traslado.id}-entrada`,
      traslado,
      tramo,
      horaCita: traslado.horaCita,
      cancelado: traslado.idaCancelada,
    };
  }
  if (traslado.choferRegreso?.id !== choferId) return null;
  return {
    key: `${traslado.id}-salida`,
    traslado,
    tramo,
    horaCita: sumarMinutos(traslado.horaCita, traslado.paciente.duracionEstimadaMin),
    cancelado: traslado.vueltaCancelada,
  };
}

function formatearFecha(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

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

export default function ChoferWeekGrid({ traslados, dias, choferId }: ChoferWeekGridProps) {
  const [hover, setHover] = useState<HoverChofer | null>(null);

  const celdas = useMemo(() => {
    const map = new Map<string, Chip[]>();
    traslados.forEach((t) => {
      (["entrada", "salida"] as Tramo[]).forEach((tramo) => {
        const chip = tramoChip(t, tramo, choferId);
        if (!chip) return;
        const key = `${t.fecha}|${slotDe(chip.horaCita)}`;
        const lista = map.get(key) ?? [];
        lista.push(chip);
        map.set(key, lista);
      });
    });
    return map;
  }, [traslados, choferId]);

  function handleOpen(e: MouseEvent<HTMLSpanElement>, chip: Chip, dia: DiaSemana) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const left = Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 16);
    setHover({ chip, dia, top: rect.bottom + 6, left: Math.max(8, left) });
  }

  return (
    <div className="week-grid-wrap" onClick={() => setHover(null)}>
      <table className="week-grid">
        <thead>
          <tr>
            <th className="week-grid-hour-header">Hora</th>
            {dias.map((d) => (
              <th key={d.fecha}>
                {DIA_LABEL[d.dia]}
                <span className="week-grid-day-fecha"> {formatearFecha(d.fecha)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SLOTS.map((slot, i) => (
            <tr key={slot} className={i % 2 === 1 ? "week-grid-row--alt" : undefined}>
              <td className="week-grid-hour">{slot}</td>
              {dias.map((d) => {
                const chips = celdas.get(`${d.fecha}|${slot}`) ?? [];
                return (
                  <td key={d.fecha} className="week-grid-cell">
                    {chips.map((chip) => {
                      const TramoIcon = chip.tramo === "salida" ? LogOut : LogIn;
                      return (
                        <span
                          key={chip.key}
                          className={`week-grid-patient${chip.tramo === "salida" ? " week-grid-patient--salida" : ""}${chip.cancelado ? " week-grid-patient--cancelada" : ""}`}
                          onClick={(e) => handleOpen(e, chip, d.dia)}
                        >
                          <TramoIcon
                            size={11}
                            className={`week-grid-patient-icon${chip.tramo === "salida" ? " week-grid-patient-icon--salida" : ""}`}
                          />
                          {chip.traslado.paciente.nombre}
                          <span className="week-grid-patient-centro">
                            {abreviarCentro(chip.traslado.paciente.centro.nombre)}
                          </span>
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
        <div
          className="week-grid-popover week-grid-popover--interactive"
          style={{ top: hover.top, left: hover.left, width: POPOVER_WIDTH }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="week-grid-popover-header">
            <span className="week-grid-popover-nombre">{hover.chip.traslado.paciente.nombre}</span>
            <button type="button" className="week-grid-popover-close" onClick={() => setHover(null)}>
              <X size={14} />
            </button>
          </div>

          <div className="week-grid-popover-turno">
            {DIA_LABEL[hover.dia]} {formatearFecha(hover.chip.traslado.fecha)} · {hover.chip.horaCita} ·{" "}
            {TRAMO_LABEL[hover.chip.tramo]}
          </div>

          <div className="week-grid-popover-row">
            <Badge estado={hover.chip.traslado.estado} />
            {hover.chip.cancelado && (
              <span className="week-grid-popover-tramo-cancelada">Tramo cancelado</span>
            )}
          </div>

          <div className="week-grid-popover-row">
            <Building2 size={13} />
            {hover.chip.traslado.paciente.centro.nombre}
          </div>
          <div className="week-grid-popover-row">
            <MapPin size={13} />
            {hover.chip.traslado.paciente.direccion}
          </div>
          <div className="week-grid-popover-row">
            <Phone size={13} />
            {hover.chip.traslado.paciente.telefono}
          </div>
          <div className="week-grid-popover-row">
            <Car size={13} />
            {hover.chip.tramo === "salida"
              ? (hover.chip.traslado.choferRegreso?.nombre ?? hover.chip.traslado.chofer.nombre)
              : hover.chip.traslado.chofer.nombre}
          </div>

          {hover.chip.traslado.paciente.requiereSillaDeRuedas && (
            <div className="week-grid-popover-row week-grid-popover-row--alerta">
              <AlertTriangle size={13} />
              Requiere silla de ruedas
            </div>
          )}
          {hover.chip.traslado.paciente.observacion && (
            <div className="week-grid-popover-observacion">{hover.chip.traslado.paciente.observacion}</div>
          )}
        </div>
      )}
    </div>
  );
}
