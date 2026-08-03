"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Pencil, MessageCircle } from "lucide-react";
import Badge from "@/components/ui/Badge/Badge";
import Button from "@/components/ui/Button/Button";
import TrasladoModal from "@/components/modals/TrasladoModal/TrasladoModal";
import WhatsAppModal from "@/components/modals/WhatsAppModal/WhatsAppModal";
import Loader from "@/components/ui/Loader/Loader";
import { fetchTraslados, fetchPacientes } from "@/lib/api-client";
import type { Paciente, Traslado } from "@/types/models";

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

function ciudad(direccion: string) {
  const partes = direccion.split(",");
  return partes[partes.length - 1]?.trim() ?? direccion;
}

export default function TransfersPage() {
  const [traslados, setTraslados] = useState<Traslado[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingTraslado, setEditingTraslado] = useState<Traslado | null>(null);
  const [whatsappPaciente, setWhatsappPaciente] = useState<Paciente | null>(null);

  useEffect(() => {
    Promise.all([fetchTraslados(), fetchPacientes()])
      .then(([t, p]) => {
        setTraslados(t);
        setPacientes(p);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const trasladosActualizados = useMemo(
    () =>
      traslados.map((t) => ({
        ...t,
        paciente: pacientes.find((p) => p.id === t.paciente.id) ?? t.paciente,
      })),
    [traslados, pacientes],
  );

  function handleSaveTraslado(guardado: Traslado) {
    setTraslados((prev) => {
      const existe = prev.some((t) => t.id === guardado.id);
      return existe ? prev.map((t) => (t.id === guardado.id ? guardado : t)) : [...prev, guardado];
    });
    setEditingTraslado(null);
  }

  if (loading) return <div className="page-loading"><Loader /></div>;
  if (error) return <div className="patients-page">Error: {error}</div>;

  return (
    <div className="patients-page">
      <div className="patients-header">
        <div>
          <h1 className="patients-title">Traslados</h1>
          <span className="patients-count">{trasladosActualizados.length} en cola</span>
        </div>
      </div>

      <div className="patients-list">
        {trasladosActualizados.map((t) => (
          <div key={t.id} className="patient-card">
            <div className="patient-card-avatar">{iniciales(t.paciente.nombre)}</div>

            <div className="patient-card-body">
              <div className="patient-card-top">
                <span className="patient-card-name">{t.paciente.nombre}</span>
                <span className="transfer-card-codigo mono">{`${t.horaCita} // ${t.codigo}`}</span>
                <Badge estado={t.estado} />
              </div>

              <div className="patient-card-meta">
                {t.paciente.telefono}
                <span className="patient-card-meta-sep">·</span>
                Chofer ida: {t.chofer.nombre}
                {t.choferRegreso && <> · Chofer vuelta: {t.choferRegreso.nombre}</>}
              </div>

              <div className="patient-card-actions">
                <Button variant="secondary" icon={<Pencil size={13} />} onClick={() => setEditingTraslado(t)}>
                  Modificar
                </Button>
                <Button
                  variant="whatsapp"
                  icon={<MessageCircle size={13} />}
                  onClick={() => setWhatsappPaciente(t.paciente)}
                >
                  WhatsApp
                </Button>
              </div>

              <div className="transfer-card-footer">
                <span className="transfer-card-footer-ciudad">{ciudad(t.paciente.direccion)}</span>
                <ArrowRight size={13} className="transfer-card-footer-arrow" />
                <span className="transfer-card-footer-destino">{t.centroDestino.nombre}</span>
              </div>
            </div>
          </div>
        ))}

        {trasladosActualizados.length === 0 && (
          <div className="patients-empty">No hay traslados en cola hoy</div>
        )}
      </div>

      {editingTraslado && (
        <TrasladoModal
          traslado={editingTraslado}
          pacientes={pacientes}
          onClose={() => setEditingTraslado(null)}
          onSave={handleSaveTraslado}
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
    </div>
  );
}
