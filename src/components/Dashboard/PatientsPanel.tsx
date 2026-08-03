"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchPacientes } from "@/lib/api-client";
import { DIA_ABREVIADO, type Paciente } from "@/types/models";

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

export default function PatientsPanel() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    fetchPacientes()
      .then(setPacientes)
      .catch(() => setPacientes([]));
  }, []);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return pacientes;
    return pacientes.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [busqueda, pacientes]);

  return (
    <div className="side-panel">
      <div className="side-panel-header">
        <span className="side-panel-title">Pacientes</span>
        <Link href="/patients" className="side-panel-cta">
          Nuevo
        </Link>
      </div>

      <input
        className="side-panel-search"
        type="text"
        placeholder="Buscar paciente..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <div className="side-panel-list">
        {resultados.slice(0, 6).map((p) => (
          <Link
            key={p.id}
            href={`/patients?centro=${p.centro.id}`}
            className="side-panel-item hoverable-row"
          >
            <span className="side-panel-item-avatar">{iniciales(p.nombre)}</span>
            <span className="side-panel-item-name">{p.nombre}</span>
            <span className="side-panel-item-days">
              {p.horarios.map((h) => (
                <span key={h.dia} className="side-panel-item-day">
                  {DIA_ABREVIADO[h.dia]}
                </span>
              ))}
            </span>
          </Link>
        ))}

        {resultados.length === 0 && (
          <div className="side-panel-empty">No se encontraron pacientes</div>
        )}
      </div>
    </div>
  );
}
