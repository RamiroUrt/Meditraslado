import { CheckCircle2, Clock, XCircle, CircleOff } from "lucide-react";
import type { Traslado } from "@/lib/types";

const ESTADO_ICON: Record<Traslado["estado"], { icon: typeof CheckCircle2; colorVar: string }> = {
  PENDIENTE: { icon: Clock, colorVar: "--state-pending" },
  CONFIRMADO: { icon: CheckCircle2, colorVar: "--state-confirmed" },
  CANCELADO: { icon: XCircle, colorVar: "--state-cancelled" },
  EXPIRADO: { icon: CircleOff, colorVar: "--state-expired" },
};

interface TransferListProps {
  transfers: Traslado[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function TransferList({ transfers, selectedId, onSelect }: TransferListProps) {
  return (
    <div className="transfer-list">
      <div className="transfer-list-header">
        <span className="label">Cola de traslados</span>
        <span className="transfer-list-count">{`Traslados de hoy - ${transfers.length}`}</span>
      </div>
      <div className="transfer-list-items">
        {transfers.map((t) => {
          const isSelected = t.id === selectedId;
          const { icon: Icon, colorVar } = ESTADO_ICON[t.estado];
          return (
            <button
              key={t.id}
              type="button"
              className={`transfer-list-item${isSelected ? " transfer-list-item--selected" : ""}`}
              onClick={() => onSelect(t.id)}
            >
              <span
                className="transfer-list-icon"
                style={{
                  background: `color-mix(in srgb, var(${colorVar}) 18%, transparent)`,
                  color: `var(${colorVar})`,
                }}
              >
                <Icon size={13} />
              </span>
              <span className="transfer-list-body">
                <span className="transfer-list-meta mono">{`${t.horaCita} // ${t.codigo}`}</span>
                <span className="transfer-list-name">{t.paciente.nombre}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
