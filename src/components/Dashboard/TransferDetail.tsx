import Image from "next/image";
import { MapPin, Building2, AlertTriangle, Pencil, MessageCircle, Clock } from "lucide-react";
import Badge from "@/components/ui/Badge/Badge";
import Button from "@/components/ui/Button/Button";
import { DIA_ABREVIADO } from "@/types/models";
import type { TransferDetailProps } from "@/types/dashboard";

function EmptyDetail() {
  return (
    <div className="transfer-detail transfer-detail--empty">
      <Image src="/logo.png" alt="" width={72} height={72} priority />
      <span>Seleccioná un traslado</span>
    </div>
  );
}

export default function TransferDetail({
  transfer,
  onWhatsappClick,
  onModificarClick,
  onToggleIda,
  onToggleVuelta,
}: TransferDetailProps) {
  if (!transfer) return <EmptyDetail />;

  const { paciente } = transfer;

  return (
    <div className="transfer-detail">
      <div className="transfer-detail-top">
        <div>
          <h2 className="transfer-detail-name">{paciente.nombre}</h2>
          <div className="transfer-detail-subline mono">Traslado {transfer.codigo}</div>
        </div>
        <div className="transfer-detail-actions">
          <Button variant="secondary" icon={<Pencil size={14} />} onClick={onModificarClick}>
            Modificar
          </Button>
          <Button variant="whatsapp" icon={<MessageCircle size={14} />} onClick={onWhatsappClick}>
            WhatsApp
          </Button>
        </div>
      </div>

      <div className="transfer-detail-turno">
        <Clock size={16} />
        <span className="transfer-detail-turno-label">Horario de turno</span>
        <span className="transfer-detail-turno-hora mono">{transfer.horaCita}</span>
        <Badge estado={transfer.estado} />
      </div>

      <div className="transfer-detail-choferes">
        <div className="transfer-detail-chofer">
          <span className="label">Chofer ida</span>
          <div className="transfer-detail-tramo-row">
            <span
              className={`transfer-detail-chofer-nombre${transfer.idaCancelada ? " transfer-detail-chofer-nombre--cancelada" : ""}`}
            >
              {transfer.chofer.nombre}
            </span>
            {transfer.idaCancelada && <span className="transfer-detail-tramo-badge">Cancelada</span>}
            <button type="button" className="transfer-detail-tramo-toggle" onClick={onToggleIda}>
              {transfer.idaCancelada ? "Reactivar" : "Cancelar"}
            </button>
          </div>
        </div>
        {transfer.choferRegreso && (
          <div className="transfer-detail-chofer">
            <span className="label">Chofer vuelta</span>
            <div className="transfer-detail-tramo-row">
              <span
                className={`transfer-detail-chofer-nombre${transfer.vueltaCancelada ? " transfer-detail-chofer-nombre--cancelada" : ""}`}
              >
                {transfer.choferRegreso.nombre}
              </span>
              {transfer.vueltaCancelada && <span className="transfer-detail-tramo-badge">Cancelada</span>}
              <button type="button" className="transfer-detail-tramo-toggle" onClick={onToggleVuelta}>
                {transfer.vueltaCancelada ? "Reactivar" : "Cancelar"}
              </button>
            </div>
          </div>
        )}
      </div>

      {paciente.horarios.length > 0 && (
        <section className="transfer-detail-section">
          <div className="label">Días de asistencia</div>
          <div className="transfer-detail-days">
            {paciente.horarios.map((h) => (
              <span key={h.dia} className="transfer-detail-day-badge">
                {DIA_ABREVIADO[h.dia]}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="transfer-detail-section">
        <div className="label">Residencia</div>
        <p className="transfer-detail-line">
          <MapPin size={15} />
          {paciente.direccion}
        </p>
      </section>

      <section className="transfer-detail-section">
        <div className="label">Centro de destino</div>
        <p className="transfer-detail-line">
          <Building2 size={15} />
          {transfer.destino}
        </p>
      </section>

      <section className="transfer-detail-section">
        <div className="label">Requisitos especiales</div>
        <p
          className={`transfer-detail-line${paciente.requiereSillaDeRuedas ? " transfer-detail-alert" : ""}`}
        >
          {paciente.requiereSillaDeRuedas && <AlertTriangle size={15} />}
          {paciente.requiereSillaDeRuedas ? "Requiere silla de ruedas" : "Sin requisitos adicionales"}
        </p>
      </section>

      {transfer.observacion && (
        <section className="transfer-detail-section">
          <div className="label">Observación</div>
          <p className="transfer-detail-observacion">&ldquo;{transfer.observacion}&rdquo;</p>
        </section>
      )}
    </div>
  );
}
