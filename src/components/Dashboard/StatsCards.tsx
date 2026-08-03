import Link from "next/link";
import { CheckCircle2, Clock, XCircle, CircleOff, Users } from "lucide-react";
import type { StatsHoy } from "@/types/dashboard";

const SMALL_CARDS = [
  {
    key: "confirmados",
    label: "Confirmados",
    colorVar: "--state-confirmed",
    subtitle: "traslados hoy",
    icon: CheckCircle2,
  },
  {
    key: "pendientes",
    label: "Pendientes",
    colorVar: "--state-pending",
    subtitle: "sin confirmar",
    icon: Clock,
  },
  {
    key: "cancelados",
    label: "Cancelados",
    colorVar: "--state-cancelled",
    subtitle: "viajes cancelado",
    icon: XCircle,
  },
  {
    key: "expirados",
    label: "Expirados",
    colorVar: "--state-expired",
    subtitle: "sin respuesta",
    icon: CircleOff,
  },
] as const;

function PacientesCard({ stats }: { stats: StatsHoy }) {
  const maxCentro = Math.max(1, ...stats.pacientesPorCentro.map((c) => c.cantidad));

  return (
    <div className="stats-card stats-card--lg">
      <div className="stats-card-top">
        <span className="stats-card-label">Pacientes</span>
        <span
          className="stats-card-badge stats-card-badge--lg"
          style={{
            background: "color-mix(in srgb, var(--accent-blue) 18%, transparent)",
            color: "var(--accent-blue)",
          }}
        >
          <Users size={22} />
        </span>
      </div>

      <div className="stats-card-lg-hero">
        <div className="stats-card-value stats-card-value--lg" style={{ color: "var(--accent-blue)" }}>
          {stats.pacientesActivos}
        </div>
        <div className="stats-card-subtitle">activos</div>
      </div>

      {stats.pacientesPorCentro.length > 0 && (
        <div className="stats-card-lg-breakdown">
          <div className="stats-card-lg-breakdown-title">Por centro</div>
          {stats.pacientesPorCentro.map((c) => (
            <Link key={c.id} href={`/patients?centro=${c.id}`} className="stats-card-lg-row hoverable-row">
              <span className="stats-card-lg-row-label">{c.nombre}</span>
              <span className="stats-card-lg-row-bar">
                <span
                  className="stats-card-lg-row-bar-fill"
                  style={{ width: `${(c.cantidad / maxCentro) * 100}%` }}
                />
              </span>
              <span className="stats-card-lg-row-value">{c.cantidad}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StatsCards({ stats }: { stats: StatsHoy }) {
  return (
    <div className="stats-cards">
      <PacientesCard key="pacientes" stats={stats} />

      {SMALL_CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className="stats-card">
            <div className="stats-card-top">
              <span className="stats-card-label">{card.label}</span>
              <span
                className="stats-card-badge"
                style={{
                  background: `color-mix(in srgb, var(${card.colorVar}) 18%, transparent)`,
                  color: `var(${card.colorVar})`,
                }}
              >
                <Icon size={16} />
              </span>
            </div>
            <div className="stats-card-value" style={{ color: `var(${card.colorVar})` }}>
              {stats[card.key]}
            </div>
            <div className="stats-card-subtitle">{card.subtitle}</div>
          </div>
        );
      })}
    </div>
  );
}
