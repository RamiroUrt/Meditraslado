"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import WeeklyScheduleGrid from "@/components/Calendar/WeeklyScheduleGrid";
import ChoferWeekGrid from "@/components/Calendar/ChoferWeekGrid";
import Select from "@/components/ui/Select/Select";
import Loader from "@/components/ui/Loader/Loader";
import { fetchPacientes, fetchCentros, fetchTraslados } from "@/lib/api-client";
import { semanaActual } from "@/lib/calendario";
import type { Centro, Paciente, Traslado } from "@/types/models";

export default function CalendarPage() {
  const { data: session } = useSession();
  const esAdmin = session?.user?.rol === "ADMIN";
  const esChofer = session?.user?.rol === "CHOFER";
  const miCentroId = session?.user?.centroId ?? null;
  const miChoferId = session?.user?.choferId ?? null;

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [traslados, setTraslados] = useState<Traslado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
  const [centroSeleccionado, setCentroSeleccionado] = useState("");

  const semana = useMemo(() => semanaActual(), []);

  useEffect(() => {
    if (!esChofer) return;
    let activo = true;
    let primerCarga = true;

    const cargar = () => {
      fetchTraslados(semana[0].fecha, semana[semana.length - 1].fecha)
        .then((t) => {
          if (!activo) return;
          setTraslados(t);
          setUltimaActualizacion(new Date());
        })
        .catch((e) => {
          if (!activo) return;
          if (primerCarga) setError(e.message);
        })
        .finally(() => {
          if (!activo) return;
          if (primerCarga) setLoading(false);
          primerCarga = false;
        });
    };

    cargar();
    const intervalo = window.setInterval(cargar, 60_000);
    window.addEventListener("focus", cargar);
    return () => {
      activo = false;
      window.clearInterval(intervalo);
      window.removeEventListener("focus", cargar);
    };
  }, [esChofer, semana]);

  useEffect(() => {
    if (esChofer) return;
    let activo = true;
    Promise.all([fetchPacientes(), fetchCentros()])
      .then(([p, c]) => {
        if (!activo) return;
        setPacientes(p);
        setCentros(c);
        setCentroSeleccionado((prev) => prev || c[0]?.id || "");
      })
      .catch((e) => {
        if (activo) setError(e.message);
      })
      .finally(() => {
        if (activo) setLoading(false);
      });
    return () => {
      activo = false;
    };
  }, [esChofer]);

  const centroActivo = esAdmin ? centroSeleccionado : miCentroId;
  const nombreCentroActivo = centros.find((c) => c.id === centroActivo)?.nombre ?? "";

  const pacientesFiltrados = useMemo(
    () =>
      esChofer
        ? pacientes.filter(
            (p) =>
              p.choferAsignado?.id === miChoferId || (p.choferVuelta?.id ?? p.choferAsignado?.id) === miChoferId,
          )
        : pacientes.filter((p) => p.centro.id === centroActivo),
    [pacientes, esChofer, miChoferId, centroActivo],
  );

  if (loading) return <div className="page-loading"><Loader /></div>;
  if (error) return <div className="calendar-page">Error: {error}</div>;

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <div>
          <h1 className="calendar-title">{esChofer ? "Mi ruta semanal" : "Calendario semanal"}</h1>
          <span className="calendar-subtitle">
            {esChofer
              ? "Tus traslados de esta semana — la ruta del día también llega por WhatsApp"
              : "Horarios recurrentes de pacientes por centro"}
          </span>
        </div>

        {esChofer ? (
          <div className="live-badge" title="Se actualiza automáticamente">
            <span className="live-badge-dot" />
            En vivo
            {ultimaActualizacion && (
              <span className="live-badge-time">
                {ultimaActualizacion.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        ) : esAdmin ? (
          <Select
            className="calendar-centro-select"
            value={centroSeleccionado}
            onChange={(e) => setCentroSeleccionado(e.target.value)}
          >
            {centros.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        ) : (
          <span className="calendar-centro-label">{nombreCentroActivo}</span>
        )}
      </div>

      {esChofer ? (
        <ChoferWeekGrid traslados={traslados} dias={semana} choferId={miChoferId ?? ""} />
      ) : (
        <WeeklyScheduleGrid pacientes={pacientesFiltrados} />
      )}
    </div>
  );
}
