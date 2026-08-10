"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Download, Printer } from "lucide-react";
import Button from "@/components/ui/Button/Button";
import Select from "@/components/ui/Select/Select";
import Input from "@/components/ui/Input/Input";
import Loader from "@/components/ui/Loader/Loader";
import { fetchCentros } from "@/lib/api-client";
import type { Centro } from "@/types/models";

type Tipo = "traslados" | "pacientes" | "choferes" | "eventos";

interface Fila {
  [key: string]: string | number;
}

interface Columnas {
  key: string;
  label: string;
}

const COLUMNAS: Record<Tipo, Columnas[]> = {
  traslados: [
    { key: "fecha", label: "Fecha" },
    { key: "horaCita", label: "Hora" },
    { key: "codigo", label: "Código" },
    { key: "paciente", label: "Paciente" },
    { key: "telefono", label: "Teléfono" },
    { key: "destino", label: "Destino" },
    { key: "choferIda", label: "Chofer ida" },
    { key: "choferVuelta", label: "Chofer vuelta" },
    { key: "estado", label: "Estado" },
    { key: "observacion", label: "Observación" },
  ],
  pacientes: [
    { key: "nombre", label: "Paciente" },
    { key: "direccion", label: "Dirección" },
    { key: "telefono", label: "Teléfono" },
    { key: "centro", label: "Centro" },
    { key: "choferIda", label: "Chofer ida" },
    { key: "choferVuelta", label: "Chofer vuelta" },
    { key: "duracionMin", label: "Duración (min)" },
    { key: "activo", label: "Activo" },
    { key: "sillaDeRuedas", label: "Silla" },
    { key: "dias", label: "Días" },
    { key: "observacion", label: "Observación" },
  ],
  choferes: [
    { key: "chofer", label: "Chofer" },
    { key: "fecha", label: "Fecha" },
    { key: "horaCita", label: "Hora" },
    { key: "paciente", label: "Paciente" },
    { key: "tramo", label: "Tramo" },
    { key: "estado", label: "Estado" },
  ],
  eventos: [
    { key: "fechaHora", label: "Fecha y hora" },
    { key: "usuario", label: "Usuario" },
    { key: "mensaje", label: "Evento" },
    { key: "paciente", label: "Paciente" },
    { key: "centro", label: "Centro" },
  ],
};

const TIPOS: { value: Tipo; label: string }[] = [
  { value: "traslados", label: "Traslados" },
  { value: "pacientes", label: "Pacientes" },
  { value: "choferes", label: "Carga por chofer" },
  { value: "eventos", label: "Historial (auditoría)" },
];

const ESTADOS = new Set(["pendiente", "confirmado", "cancelado", "expirado"]);
const MONO_KEYS = new Set(["fecha", "horaCita", "codigo", "telefono"]);

function EstadoBadge({ valor }: { valor: string | number }) {
  const key = String(valor).toLowerCase();
  if (!ESTADOS.has(key)) return <>{valor}</>;
  return (
    <span className={`badge badge--${key}`}>
      <span className="badge-dot" />
      {valor}
    </span>
  );
}

function hoyIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function inicioMesIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function escaparCelda(valor: string | number) {
  return `"${String(valor ?? "").replace(/"/g, '""')}"`;
}

function descargarCsv(nombre: string, columnas: Columnas[], filas: Fila[]) {
  const header = columnas.map((c) => escaparCelda(c.label)).join(";");
  const cuerpo = filas.map((f) => columnas.map((c) => escaparCelda(f[c.key])).join(";")).join("\r\n");
  const csv = `\uFEFF${header}\r\n${cuerpo}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const esAdmin = session?.user?.rol === "ADMIN";
  const tiposVisibles = esAdmin ? TIPOS : TIPOS.filter((t) => t.value !== "eventos");

  const [tipo, setTipo] = useState<Tipo>("traslados");
  const [desde, setDesde] = useState(inicioMesIso);
  const [hasta, setHasta] = useState(hoyIso);
  const [centroId, setCentroId] = useState("");
  const [centros, setCentros] = useState<Centro[]>([]);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCentros()
      .then(setCentros)
      .catch(() => {});
  }, []);

  const tipoEfectivo = !esAdmin && tipo === "eventos" ? "traslados" : tipo;

  useEffect(() => {
    let activo = true;
    const params = new URLSearchParams({ tipo: tipoEfectivo, desde, hasta });
    if (centroId) params.set("centroId", centroId);

    fetch(`/api/reportes?${params.toString()}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "No se pudo generar el reporte");
        return data;
      })
      .then((data) => {
        if (!activo) return;
        setFilas(data.filas ?? []);
        setError(null);
      })
      .catch((e) => {
        if (activo) setError(e instanceof Error ? e.message : "No se pudo generar el reporte");
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, [tipoEfectivo, desde, hasta, centroId]);

  const columnas = COLUMNAS[tipoEfectivo];
  const nombreArchivo = `meditraslado_${tipoEfectivo}_${desde}_${hasta}`;
  const tituloReporte = `MediTraslado — ${TIPOS.find((t) => t.value === tipoEfectivo)?.label} (${desde} a ${hasta})`;

  const filasVisibles = useMemo<Fila[]>(() => {
    if (tipoEfectivo !== "eventos") return filas;
    return filas.map((f) => ({
      ...f,
      fechaHora: new Date(String(f.fechaHora)).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    }));
  }, [tipoEfectivo, filas]);

  const resumen = useMemo(() => {
    if (tipoEfectivo === "eventos") {
      const conteo = new Map<string, number>();
      filas.forEach((f) => {
        const nombre = String(f.usuario ?? "Sistema");
        conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
      });
      return Array.from(conteo, ([label, cantidad]) => ({ label, cantidad, color: "neutral" as const }));
    }

    if (tipoEfectivo === "choferes") {
      const conteo = new Map<string, number>();
      filas.forEach((f) => {
        const nombre = String(f.chofer ?? "Sin chofer");
        conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
      });
      return Array.from(conteo, ([label, cantidad]) => ({ label, cantidad, color: "neutral" as const }));
    }

    if (tipoEfectivo === "pacientes") {
      const activos = filas.filter((f) => f.activo === "Sí").length;
      return [
        { label: "Activos", cantidad: activos, color: "activo" as const },
        { label: "Inactivos", cantidad: filas.length - activos, color: "inactivo" as const },
      ];
    }

    const mapa: Record<string, "pendiente" | "confirmado" | "cancelado" | "expirado"> = {
      Pendiente: "pendiente",
      Confirmado: "confirmado",
      Cancelado: "cancelado",
      Expirado: "expirado",
    };
    const conteo = new Map<string, number>();
    filas.forEach((f) => {
      const estado = String(f.estado ?? "Otros");
      conteo.set(estado, (conteo.get(estado) ?? 0) + 1);
    });
    return Array.from(conteo, ([label, cantidad]) => ({ label, cantidad, color: mapa[label] ?? "neutral" }));
  }, [tipoEfectivo, filas]);

  return (
    <div className="patients-page">
      <div className="patients-header">
        <div>
          <h1 className="patients-title">Reportes</h1>
          <span className="patients-count">{filasVisibles.length} filas</span>
        </div>

        <div className="reports-actions">
          <Button
            variant="secondary"
            icon={<Download size={13} />}
            disabled={filasVisibles.length === 0}
            onClick={() => descargarCsv(nombreArchivo, columnas, filasVisibles)}
          >
            Excel (.csv)
          </Button>
          <Button variant="secondary" icon={<Printer size={13} />} disabled={filasVisibles.length === 0} onClick={() => window.print()}>
            Imprimir / PDF
          </Button>
        </div>
      </div>

      <div className="reports-filters">
        <label className="reports-filter-field">
          <span className="label">Tipo de reporte</span>
          <Select className="reports-tipo-select" value={tipoEfectivo} onChange={(e) => setTipo(e.target.value as Tipo)}>
            {tiposVisibles.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="reports-filter-field">
          <span className="label">Desde</span>
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>

        <label className="reports-filter-field">
          <span className="label">Hasta</span>
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>

        {centros.length > 0 && (
          <label className="reports-filter-field">
            <span className="label">Centro</span>
            <Select value={centroId} onChange={(e) => setCentroId(e.target.value)}>
              <option value="">Todos</option>
              {centros.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      {filas.length > 0 && (
        <div className="reports-summary">
          <span className="report-summary-item">
            <span className="report-summary-count">{filasVisibles.length}</span>
            total
          </span>
          {resumen.map((r) => (
            <span key={r.label} className={`report-summary-item report-summary-item--${r.color}`}>
              <span className="report-summary-dot" />
              <span className="report-summary-count">{r.cantidad}</span>
              {r.label}
            </span>
          ))}
        </div>
      )}

      <div className="reports-preview">
        {loading ? (
          <div className="page-loading">
            <Loader />
          </div>
        ) : filas.length === 0 ? (
          <div className="patients-empty">No hay datos para los filtros seleccionados</div>
        ) : (
          <table className="reports-table">
            <thead>
              <tr>
                {columnas.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filasVisibles.map((f, i) => (
                <tr key={i}>
                  {columnas.map((c) =>
                    c.key === "estado" ? (
                      <td key={c.key}>
                        <EstadoBadge valor={f[c.key]} />
                      </td>
                    ) : (
                      <td key={c.key} className={MONO_KEYS.has(c.key) ? "mono" : undefined}>
                        {f[c.key]}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="report-print">
        <h1 className="report-print-title">{tituloReporte}</h1>
        {filas.length === 0 ? (
          <p>Sin datos para los filtros seleccionados.</p>
        ) : (
          <table>
            <thead>
              <tr>
                {columnas.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filasVisibles.map((f, i) => (
                <tr key={i}>
                  {columnas.map((c) => (
                    <td key={c.key}>{f[c.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
