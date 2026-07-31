import type { EstadoTraslado } from "@/lib/types";

const LABEL: Record<EstadoTraslado, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  CANCELADO: "Cancelado",
  EXPIRADO: "Expirado",
};

export default function Badge({ estado }: { estado: EstadoTraslado }) {
  return (
    <span className={`badge badge--${estado.toLowerCase()}`}>
      <span className="badge-dot" />
      {LABEL[estado]}
    </span>
  );
}
