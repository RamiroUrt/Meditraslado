"use client";

import { useEffect, useState } from "react";
import { fetchEventos } from "@/lib/api-client";
import type { Evento } from "@/types/models";

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function HistoryPanel() {
  const [eventos, setEventos] = useState<Evento[]>([]);

  useEffect(() => {
    fetchEventos(true)
      .then(setEventos)
      .catch(() => setEventos([]));
  }, []);

  return (
    <div className="side-panel">
      <div className="side-panel-header">
        <span className="side-panel-title">Historial del Sistema</span>
        <span className="side-panel-count">{eventos.length} eventos</span>
      </div>

      {eventos.length === 0 ? (
        <div className="side-panel-empty">No hay cambios registrados hoy</div>
      ) : (
        <div className="side-panel-list">
          {eventos.map((evento) => (
            <div key={evento.id} className="historial-panel-item">
              <span className="historial-panel-hora mono">{hora(evento.createdAt)}</span>
              <span className="historial-panel-mensaje">{evento.mensaje}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
