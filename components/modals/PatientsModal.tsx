"use client";

import { useEffect, useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import Label from "@/components/ui/Label";
import Input, { Select, Textarea } from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import Button from "@/components/ui/Button";
import { fetchCentros, fetchChoferes } from "@/lib/api-client";
import {
  DIA_ABREVIADO,
  type Centro,
  type Chofer,
  type DiaSemana,
  type Paciente,
  type PacienteHorario,
} from "@/lib/types";

const DIAS: DiaSemana[] = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];

const CODIGOS_PAIS = [
  { codigo: "+54", label: "🇦🇷 +54" },
  { codigo: "+598", label: "🇺🇾 +598" },
  { codigo: "+56", label: "🇨🇱 +56" },
  { codigo: "+595", label: "🇵🇾 +595" },
  { codigo: "+55", label: "🇧🇷 +55" },
  { codigo: "+591", label: "🇧🇴 +591" },
];

function separarTelefono(telefono: string) {
  const encontrado = CODIGOS_PAIS.find((c) => telefono.startsWith(c.codigo));
  if (encontrado) return { codigoPais: encontrado.codigo, numero: telefono.slice(encontrado.codigo.length) };
  return { codigoPais: CODIGOS_PAIS[0].codigo, numero: telefono.replace(/^\+/, "") };
}

interface PatientsModalProps {
  paciente: Paciente | null;
  centroInicial?: Centro;
  bloquearCentro?: boolean;
  onClose: () => void;
  onSave: (paciente: Omit<Paciente, "id">) => Promise<void>;
}

export default function PatientsModal({
  paciente,
  centroInicial,
  bloquearCentro,
  onClose,
  onSave,
}: PatientsModalProps) {
  const esNuevo = paciente === null;
  const [centros, setCentros] = useState<Centro[]>(
    paciente ? [paciente.centro] : centroInicial ? [centroInicial] : [],
  );
  const [choferes, setChoferes] = useState<Chofer[]>(paciente?.choferAsignado ? [paciente.choferAsignado] : []);

  const [nombre, setNombre] = useState(paciente?.nombre ?? "");
  const [direccion, setDireccion] = useState(paciente?.direccion ?? "");
  const [codigoPais, setCodigoPais] = useState(() => separarTelefono(paciente?.telefono ?? "+54").codigoPais);
  const [numeroTelefono, setNumeroTelefono] = useState(() => separarTelefono(paciente?.telefono ?? "+54").numero);
  const [centroId, setCentroId] = useState(paciente?.centro.id ?? centroInicial?.id ?? "");
  const [choferId, setChoferId] = useState(paciente?.choferAsignado?.id ?? "");
  const [choferVueltaId, setChoferVueltaId] = useState(
    paciente?.choferVuelta?.id ?? paciente?.choferAsignado?.id ?? "",
  );
  const [duracionEstimadaMin, setDuracionEstimadaMin] = useState(paciente?.duracionEstimadaMin ?? 45);
  const [activo, setActivo] = useState(paciente?.activo ?? true);
  const [requiereSillaDeRuedas, setRequiereSillaDeRuedas] = useState(paciente?.requiereSillaDeRuedas ?? false);
  const [observacion, setObservacion] = useState(paciente?.observacion ?? "");
  const [horarios, setHorarios] = useState<Partial<Record<DiaSemana, string>>>(() => {
    const map: Partial<Record<DiaSemana, string>> = {};
    paciente?.horarios.forEach((h) => {
      map[h.dia] = h.horaCita;
    });
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchCentros(), fetchChoferes()])
      .then(([c, ch]) => {
        setCentros(c);
        setChoferes(ch);
        setCentroId((prev) => prev || c[0]?.id || "");
      })
      .catch(() => {});
  }, []);

  function toggleDia(dia: DiaSemana) {
    setHorarios((prev) => {
      const next = { ...prev };
      if (dia in next) {
        delete next[dia];
      } else {
        next[dia] = "09:00";
      }
      return next;
    });
  }

  function setHoraCita(dia: DiaSemana, hora: string) {
    setHorarios((prev) => ({ ...prev, [dia]: hora }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const centro = centros.find((c) => c.id === centroId) ?? paciente?.centro ?? centroInicial;
    const choferAsignado = choferes.find((c) => c.id === choferId) ?? null;
    const choferVuelta = choferes.find((c) => c.id === choferVueltaId) ?? null;
    const nuevosHorarios: PacienteHorario[] = DIAS.filter((d) => d in horarios).map((dia) => ({
      dia,
      horaCita: horarios[dia] as string,
    }));

    if (!centro) {
      setError("Seleccioná un centro");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        nombre: nombre.trim(),
        direccion: direccion.trim(),
        telefono: `${codigoPais}${numeroTelefono.trim()}`,
        centro,
        choferAsignado,
        choferVuelta,
        duracionEstimadaMin,
        activo,
        requiereSillaDeRuedas,
        observacion: observacion.trim() || undefined,
        horarios: nuevosHorarios,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setSaving(false);
    }
  }

  return (
    <Modal title={esNuevo ? "Nuevo paciente" : "Editar paciente"} onClose={onClose}>
      <form className="patients-modal-form" onSubmit={handleSubmit}>
        <div className="patients-modal-field">
          <Label htmlFor="pm-nombre">Nombre</Label>
          <Input
            id="pm-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Juan Pérez"
            required
          />
        </div>

        <div className="patients-modal-field">
          <Label htmlFor="pm-direccion">Dirección</Label>
          <Input
            id="pm-direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Ej: San Martín 123, Venado Tuerto"
            required
          />
        </div>

        <div className="patients-modal-row">
          <div className="patients-modal-field">
            <Label htmlFor="pm-telefono">Teléfono</Label>
            <div className="patients-modal-telefono">
              <Select
                id="pm-codigo-pais"
                className="patients-modal-telefono-codigo"
                value={codigoPais}
                onChange={(e) => setCodigoPais(e.target.value)}
              >
                {CODIGOS_PAIS.map((c) => (
                  <option key={c.codigo} value={c.codigo}>
                    {c.label}
                  </option>
                ))}
              </Select>
              <Input
                id="pm-telefono"
                value={numeroTelefono}
                onChange={(e) => setNumeroTelefono(e.target.value)}
                placeholder="9 3462 501730"
                required
              />
            </div>
          </div>

          <div className="patients-modal-field">
            <Label htmlFor="pm-centro">Centro</Label>
            <Select
              id="pm-centro"
              value={centroId}
              onChange={(e) => setCentroId(e.target.value)}
              disabled={bloquearCentro}
            >
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
            <Label htmlFor="pm-chofer">Chofer ida</Label>
            <Select id="pm-chofer" value={choferId} onChange={(e) => setChoferId(e.target.value)}>
              <option value="">Sin asignar</option>
              {choferes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </div>

          <div className="patients-modal-field">
            <Label htmlFor="pm-chofer-vuelta">Chofer vuelta</Label>
            <Select
              id="pm-chofer-vuelta"
              value={choferVueltaId}
              onChange={(e) => setChoferVueltaId(e.target.value)}
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
          <Label htmlFor="pm-duracion">Duración estimada del turno (min)</Label>
          <input
            id="pm-duracion"
            type="number"
            min={5}
            step={5}
            className="form-input"
            value={duracionEstimadaMin}
            onChange={(e) => setDuracionEstimadaMin(Number(e.target.value) || 0)}
          />
        </div>

        <div className="patients-modal-field">
          <Label>Días de asistencia</Label>
          <div className="patients-modal-dias">
            {DIAS.map((dia) => {
              const diaActivo = dia in horarios;
              return (
                <div key={dia} className={`patients-modal-dia${diaActivo ? " patients-modal-dia--activo" : ""}`}>
                  <Checkbox
                    id={`pm-dia-${dia}`}
                    label={DIA_ABREVIADO[dia]}
                    checked={diaActivo}
                    onChange={() => toggleDia(dia)}
                  />
                  {diaActivo && (
                    <input
                      type="time"
                      className="form-input patients-modal-dia-hora"
                      value={horarios[dia]}
                      onChange={(e) => setHoraCita(dia, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="patients-modal-row">
          <Checkbox
            id="pm-silla"
            label="Requiere silla de ruedas"
            checked={requiereSillaDeRuedas}
            onChange={(e) => setRequiereSillaDeRuedas(e.target.checked)}
          />
          <Checkbox
            id="pm-activo"
            label="Paciente activo"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
          />
        </div>

        <div className="patients-modal-field">
          <Label htmlFor="pm-observacion">Observación</Label>
          <Textarea
            id="pm-observacion"
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
          <Button type="submit" variant="primary" loading={saving}>
            {saving ? "Guardando..." : esNuevo ? "Crear paciente" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
