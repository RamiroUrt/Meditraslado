"use client";

import { useEffect, useMemo, useState } from "react";
import Loader from "@/components/ui/Loader/Loader";
import { fetchEventos } from "@/lib/api-client";
import type { Evento } from "@/types/models";

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function HistoryPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soloHoy, setSoloHoy] = useState(false);

  useEffect(() => {
    fetchEventos(soloHoy)
      .then(setEventos)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [soloHoy]);

  const eventosOrdenados = useMemo(() => eventos, [eventos]);

  if (loading) return <div className="page-loading"><Loader /></div>;
  if (error) return <div className="patients-page">Error: {error}</div>;

  return (
    <div className="patients-page">
      <div className="patients-header">
        <div>
          <h1 className="patients-title">Historial</h1>
          <span className="patients-count">{eventosOrdenados.length} eventos</span>
        </div>

        <div className="patients-filters">
          <select
            className="patients-filter-select"
            value={soloHoy ? "HOY" : "TODOS"}
            onChange={(e) => setSoloHoy(e.target.value === "HOY")}
          >
            <option value="TODOS">Todo el historial</option>
            <option value="HOY">Solo hoy</option>
          </select>
        </div>
      </div>

      <div className="historial-list">
        {eventosOrdenados.map((evento) => (
          <div key={evento.id} className="historial-item">
            <span className="historial-item-fecha mono">{formatearFecha(evento.createdAt)}</span>
            <div className="historial-item-body">
              <span className="historial-item-mensaje">{evento.mensaje}</span>
              <span className="historial-item-meta">
                {evento.usuarioNombre ?? "Sistema"}
                {evento.paciente && <> · {evento.paciente.nombre}</>}
              </span>
            </div>
          </div>
        ))}

        {eventosOrdenados.length === 0 && (
          <div className="patients-empty">No hay eventos registrados</div>
        )}
      </div>
    </div>
  );
}
