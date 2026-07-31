"use client";

import { useEffect, useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import Label from "@/components/ui/Label";
import Input, { Select, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { fetchCentros, fetchChoferes, createTraslado, updateTraslado } from "@/lib/api-client";
import type { Centro, Chofer, EstadoTraslado, Paciente, Traslado } from "@/lib/types";

const ESTADO_LABEL: Record<EstadoTraslado, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  CANCELADO: "Cancelado",
  EXPIRADO: "Expirado",
};

interface TrasladoModalProps {
  traslado: Traslado | null;
  pacientes: Paciente[];
  pacientePreseleccionado?: Paciente;
  onClose: () => void;
  onSave: (traslado: Traslado) => void;
}

export default function TrasladoModal({
  traslado,
  pacientes,
  pacientePreseleccionado,
  onClose,
  onSave,
}: TrasladoModalProps) {
  const [centros, setCentros] = useState<Centro[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);

  const pacienteInicial = traslado?.paciente ?? pacientePreseleccionado;

  const [pacienteId, setPacienteId] = useState(pacienteInicial?.id ?? "");
  const [centroDestinoId, setCentroDestinoId] = useState(
    traslado?.centroDestino.id ?? pacienteInicial?.centro.id ?? "",
  );
  const [horaCita, setHoraCita] = useState(traslado?.horaCita ?? "09:00");
  const [choferId, setChoferId] = useState(traslado?.chofer.id ?? pacienteInicial?.choferAsignado?.id ?? "");
  const [choferRegresoId, setChoferRegresoId] = useState(
    traslado?.choferRegreso?.id ?? pacienteInicial?.choferVuelta?.id ?? pacienteInicial?.choferAsignado?.id ?? "",
  );
  const [estado, setEstado] = useState<EstadoTraslado>(traslado?.estado ?? "PENDIENTE");
  const [observacion, setObservacion] = useState(traslado?.observacion ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchCentros(), fetchChoferes()])
      .then(([c, ch]) => {
        setCentros(c);
        setChoferes(ch);
      })
      .catch(() => {});
  }, []);

  function handlePacienteChange(id: string) {
    setPacienteId(id);
    const p = pacientes.find((x) => x.id === id);
    if (p) {
      setCentroDestinoId(p.centro.id);
      setChoferId(p.choferAsignado?.id ?? "");
      setChoferRegresoId(p.choferVuelta?.id ?? p.choferAsignado?.id ?? "");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      pacienteId,
      centroDestinoId,
      horaCita,
      choferId,
      choferRegresoId: choferRegresoId || null,
      estado,
      observacion: observacion.trim() || null,
    };

    try {
      const guardado = traslado ? await updateTraslado(traslado.id, payload) : await createTraslado(payload);
      onSave(guardado);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setSaving(false);
    }
  }

  return (
    <Modal title={traslado ? "Modificar traslado" : "Nuevo traslado"} onClose={onClose}>
      <form className="patients-modal-form" onSubmit={handleSubmit}>
        <div className="patients-modal-field">
          <Label htmlFor="tm-paciente">Paciente</Label>
          <Select
            id="tm-paciente"
            value={pacienteId}
            onChange={(e) => handlePacienteChange(e.target.value)}
            required
          >
            <option value="" disabled>
              Seleccioná un paciente
            </option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </div>

        <div className="patients-modal-row">
          <div className="patients-modal-field">
            <Label htmlFor="tm-hora">Horario de turno</Label>
            <input
              id="tm-hora"
              type="time"
              className="form-input"
              value={horaCita}
              onChange={(e) => setHoraCita(e.target.value)}
              required
            />
          </div>

          <div className="patients-modal-field">
            <Label htmlFor="tm-centro">Centro de destino</Label>
            <Select id="tm-centro" value={centroDestinoId} onChange={(e) => setCentroDestinoId(e.target.value)}>
              {centros.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="patients-modal-row">
          <div className="patients-modal-field">
            <Label htmlFor="tm-chofer-ida">Chofer ida</Label>
            <Select id="tm-chofer-ida" value={choferId} onChange={(e) => setChoferId(e.target.value)} required>
              <option value="" disabled>
                Seleccioná un chofer
              </option>
              {choferes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </div>

          <div className="patients-modal-field">
            <Label htmlFor="tm-chofer-vuelta">Chofer vuelta</Label>
            <Select
              id="tm-chofer-vuelta"
              value={choferRegresoId}
              onChange={(e) => setChoferRegresoId(e.target.value)}
            >
              <option value="">Sin asignar</option>
              {choferes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="patients-modal-field">
          <Label htmlFor="tm-estado">Estado</Label>
          <Select
            id="tm-estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoTraslado)}
          >
            {(Object.keys(ESTADO_LABEL) as EstadoTraslado[]).map((e) => (
              <option key={e} value={e}>
                {ESTADO_LABEL[e]}
              </option>
            ))}
          </Select>
        </div>

        <div className="patients-modal-field">
          <Label htmlFor="tm-observacion">Observación</Label>
          <Textarea
            id="tm-observacion"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Notas relevantes para el traslado (opcional)"
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="patients-modal-footer">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={saving} disabled={!pacienteId}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
