"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Pencil, Trash2, MessageCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import PatientsModal from "@/components/modals/PatientsModal";
import TrasladoModal from "@/components/modals/TrasladoModal";
import WhatsAppModal from "@/components/modals/WhatsAppModal";
import Loader from "@/components/ui/Loader";
import { fetchPacientes, fetchCentros, createPaciente, updatePaciente, deletePaciente } from "@/lib/api-client";
import { DIA_ABREVIADO, type DiaSemana, type Paciente, type Centro } from "@/lib/types";

const DIAS: DiaSemana[] = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

function PatientsPageContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const esAdmin = session?.user?.rol === "ADMIN";
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [centroFiltro, setCentroFiltro] = useState(() => searchParams.get("centro") ?? "TODOS");
  const [diaFiltro, setDiaFiltro] = useState("TODOS");
  const [editingPaciente, setEditingPaciente] = useState<Paciente | null>(null);
  const [creandoPaciente, setCreandoPaciente] = useState(false);
  const [whatsappPaciente, setWhatsappPaciente] = useState<Paciente | null>(null);
  const [pacienteParaTraslado, setPacienteParaTraslado] = useState<Paciente | null>(null);
  const [pacienteAEliminar, setPacienteAEliminar] = useState<Paciente | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchPacientes(), fetchCentros()])
      .then(([p, c]) => {
        setPacientes(p);
        setCentros(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const pacientesFiltrados = useMemo(() => {
    return pacientes.filter((p) => {
      if (centroFiltro !== "TODOS" && p.centro.id !== centroFiltro) return false;
      if (diaFiltro !== "TODOS" && !p.horarios.some((h) => h.dia === diaFiltro)) return false;
      return true;
    });
  }, [pacientes, centroFiltro, diaFiltro]);

  async function handleSavePaciente(actualizado: Paciente) {
    const guardado = await updatePaciente(actualizado.id, actualizado);
    setPacientes((prev) => prev.map((p) => (p.id === guardado.id ? guardado : p)));
    setEditingPaciente(null);
  }

  async function handleCrearPaciente(nuevo: Omit<Paciente, "id">) {
    const creado = await createPaciente(nuevo);
    setPacientes((prev) => [...prev, creado]);
    setCreandoPaciente(false);
  }

  async function handleEliminarPaciente() {
    if (!pacienteAEliminar) return;
    setEliminando(true);
    setErrorEliminar(null);
    try {
      await deletePaciente(pacienteAEliminar.id);
      setPacientes((prev) => prev.filter((p) => p.id !== pacienteAEliminar.id));
      setPacienteAEliminar(null);
    } catch (err) {
      setErrorEliminar(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setEliminando(false);
    }
  }

  const centroUsuario = centros.find((c) => c.id === session?.user?.centroId);

  if (loading) return <div className="page-loading"><Loader /></div>;
  if (error) return <div className="patients-page">Error: {error}</div>;

  return (
    <div className="patients-page">
      <div className="patients-header">
        <div>
          <h1 className="patients-title">Pacientes</h1>
          <span className="patients-count">{pacientesFiltrados.length} registrados</span>
        </div>

        <div className="patients-filters">
          {esAdmin && (
            <select
              className="patients-filter-select"
              value={centroFiltro}
              onChange={(e) => setCentroFiltro(e.target.value)}
            >
              <option value="TODOS">Todos los centros</option>
              {centros.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          )}

          <select
            className="patients-filter-select"
            value={diaFiltro}
            onChange={(e) => setDiaFiltro(e.target.value)}
          >
            <option value="TODOS">Todos los días</option>
            {DIAS.map((d) => (
              <option key={d} value={d}>
                {DIA_ABREVIADO[d]}
              </option>
            ))}
          </select>

          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setCreandoPaciente(true)}>
            Paciente
          </Button>
        </div>
      </div>

      <div className="patients-list">
        {pacientesFiltrados.map((p) => (
          <div key={p.id} className="patient-card">
            <div className="patient-card-avatar">{iniciales(p.nombre)}</div>

            <div className="patient-card-body">
              <div className="patient-card-top">
                <span className="patient-card-name">{p.nombre}</span>
                <div className="patient-card-days">
                  {p.horarios.map((h) => (
                    <span key={h.dia} className="patient-card-day-badge">
                      {DIA_ABREVIADO[h.dia]}
                    </span>
                  ))}
                </div>
                <span className={`patient-card-status ${p.activo ? "" : "patient-card-status--inactive"}`}>
                  <span className="patient-card-status-dot" />
                  {p.activo ? "Activo" : "Inactivo"}
                </span>
              </div>

              <div className="patient-card-address">{p.direccion}</div>

              <div className="patient-card-meta">
                {p.telefono}
                <span className="patient-card-meta-sep">·</span>
                {p.centro.nombre}
                {p.choferAsignado && <> → {p.choferAsignado.nombre} (chofer)</>}
              </div>

              <div className="patient-card-actions">
                <Button variant="secondary" icon={<Pencil size={13} />} onClick={() => setEditingPaciente(p)}>
                  Editar paciente
                </Button>
                <Button variant="secondary" icon={<Plus size={13} />} onClick={() => setPacienteParaTraslado(p)}>
                  Traslado
                </Button>
                <Button
                  variant="whatsapp"
                  icon={<MessageCircle size={13} />}
                  onClick={() => setWhatsappPaciente(p)}
                >
                  WhatsApp
                </Button>
                {esAdmin && (
                  <Button variant="danger" icon={<Trash2 size={13} />} onClick={() => setPacienteAEliminar(p)}>
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}

        {pacientesFiltrados.length === 0 && (
          <div className="patients-empty">No hay pacientes que coincidan con el filtro</div>
        )}
      </div>

      {editingPaciente && (
        <PatientsModal
          paciente={editingPaciente}
          bloquearCentro={!esAdmin}
          onClose={() => setEditingPaciente(null)}
          onSave={(datos) => handleSavePaciente({ ...datos, id: editingPaciente.id })}
        />
      )}

      {creandoPaciente && (
        <PatientsModal
          paciente={null}
          centroInicial={!esAdmin ? centroUsuario : undefined}
          bloquearCentro={!esAdmin}
          onClose={() => setCreandoPaciente(false)}
          onSave={handleCrearPaciente}
        />
      )}

      {whatsappPaciente && (
        <WhatsAppModal
          context={{
            nombre: whatsappPaciente.nombre,
            telefono: whatsappPaciente.telefono,
            centro: whatsappPaciente.centro.nombre,
          }}
          onClose={() => setWhatsappPaciente(null)}
        />
      )}

      {pacienteParaTraslado && (
        <TrasladoModal
          traslado={null}
          pacientes={pacientes}
          pacientePreseleccionado={pacienteParaTraslado}
          onClose={() => setPacienteParaTraslado(null)}
          onSave={() => setPacienteParaTraslado(null)}
        />
      )}

      {pacienteAEliminar && (
        <Modal title="Eliminar paciente" onClose={() => setPacienteAEliminar(null)}>
          <p className="modal-confirm-text">
            ¿Seguro que querés eliminar a <strong>{pacienteAEliminar.nombre}</strong>? Se van a borrar también su
            horario y sus traslados. Esta acción no se puede deshacer.
          </p>

          {errorEliminar && <div className="form-error">{errorEliminar}</div>}

          <div className="patients-modal-footer">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPacienteAEliminar(null)}
              disabled={eliminando}
            >
              Cancelar
            </Button>
            <Button type="button" variant="danger" loading={eliminando} onClick={handleEliminarPaciente}>
              {eliminando ? "Eliminando..." : "Eliminar paciente"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function PatientsPage() {
  return (
    <Suspense fallback={<div className="page-loading"><Loader /></div>}>
      <PatientsPageContent />
    </Suspense>
  );
}
