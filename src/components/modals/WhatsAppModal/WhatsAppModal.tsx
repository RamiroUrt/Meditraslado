"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import Modal from "@/components/ui/Modal/Modal";
import Label from "@/components/ui/Label/Label";
import Textarea from "@/components/ui/Textarea/Textarea";
import Button from "@/components/ui/Button/Button";
import { enviarWhatsApp } from "@/lib/api-client";
import type { Plantilla, WhatsAppContext, WhatsAppModalProps } from "@/types/modals";

const PLANTILLAS: Plantilla[] = [
  {
    id: "recordatorio",
    label: "Recordatorio de traslado",
    build: (ctx) =>
      `Hola ${ctx.nombre} 👋, te recordamos tu traslado de hoy${ctx.hora ? ` a las ${ctx.hora}` : ""}${
        ctx.centro ? ` hacia ${ctx.centro}` : ""
      }. ¿Confirmás tu asistencia?`,
  },
  {
    id: "confirmacion",
    label: "Confirmación de traslado",
    build: (ctx) =>
      `Hola ${ctx.nombre}, tu traslado${ctx.hora ? ` de las ${ctx.hora}` : ""} quedó confirmado. ¡Te esperamos!`,
  },
  {
    id: "cancelacion",
    label: "Cancelación de traslado",
    build: (ctx) =>
      `Hola ${ctx.nombre}, tu traslado de hoy fue cancelado. Ante cualquier consulta comunicate con recepción.`,
  },
  {
    id: "demora",
    label: "Aviso de demora",
    build: (ctx) =>
      `Hola ${ctx.nombre}, el chofer tiene una demora y va a llegar unos minutos más tarde. Gracias por tu paciencia.`,
  },
];

export default function WhatsAppModal({ context, onClose }: WhatsAppModalProps) {
  const [plantillaId, setPlantillaId] = useState(PLANTILLAS[0].id);
  const [mensaje, setMensaje] = useState(PLANTILLAS[0].build(context));
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSelectPlantilla(id: string) {
    const plantilla = PLANTILLAS.find((p) => p.id === id);
    if (!plantilla) return;
    setPlantillaId(id);
    setMensaje(plantilla.build(context));
  }

  async function handleSend() {
    setError(null);
    setEnviando(true);
    try {
      await enviarWhatsApp({
        telefono: context.telefono,
        nombre: context.nombre,
        plantillaId,
        mensaje,
        hora: context.hora,
        centro: context.centro,
      });
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el mensaje");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title="Enviar WhatsApp" onClose={onClose}>
      <div className="whatsapp-modal">
        <div className="whatsapp-modal-target">
          {context.nombre} · {context.telefono}
        </div>

        <div className="whatsapp-modal-field">
          <Label>Plantilla</Label>
          <div className="whatsapp-modal-templates">
            {PLANTILLAS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`whatsapp-modal-template${p.id === plantillaId ? " whatsapp-modal-template--selected" : ""}`}
                onClick={() => handleSelectPlantilla(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="whatsapp-modal-field">
          <Label htmlFor="wa-mensaje">Mensaje</Label>
          <Textarea
            id="wa-mensaje"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={5}
          />
        </div>

        {enviado ? (
          <div className="whatsapp-modal-sent">
            <Check size={16} />
            Mensaje enviado a {context.telefono}
          </div>
        ) : null}

        {error && <div className="form-error">{error}</div>}

        <div className="whatsapp-modal-footer">
          <Button type="button" variant="secondary" onClick={onClose} disabled={enviando}>
            {enviado ? "Cerrar" : "Cancelar"}
          </Button>
          {!enviado && (
            <Button
              type="button"
              variant="whatsapp"
              icon={<Send size={14} />}
              loading={enviando}
              onClick={handleSend}
            >
              {enviando ? "Enviando..." : "Enviar"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
