import type { EstadoTraslado } from "@/types/models";

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
