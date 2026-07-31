"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import WeeklyScheduleGrid from "@/components/Calendar/WeeklyScheduleGrid";
import { Select } from "@/components/ui/Input";
import Loader from "@/components/ui/Loader";
import { fetchPacientes, fetchCentros } from "@/lib/api-client";
import type { Centro, Paciente } from "@/lib/types";

export default function CalendarPage() {
  const { data: session } = useSession();
  const esAdmin = session?.user?.rol === "ADMIN";
  const esChofer = session?.user?.rol === "CHOFER";
  const miCentroId = session?.user?.centroId ?? null;
  const miChoferId = session?.user?.choferId ?? null;

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [centroSeleccionado, setCentroSeleccionado] = useState("");

  useEffect(() => {
    Promise.all([fetchPacientes(), fetchCentros()])
      .then(([p, c]) => {
        setPacientes(p);
        setCentros(c);
        setCentroSeleccionado((prev) => prev || c[0]?.id || "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
              ? "Tus traslados recurrentes, por día y horario"
              : "Horarios recurrentes de pacientes por centro"}
          </span>
        </div>

        {esChofer ? null : esAdmin ? (
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

      <WeeklyScheduleGrid pacientes={pacientesFiltrados} choferIdActivo={esChofer ? (miChoferId ?? undefined) : undefined} />
    </div>
  );
}
