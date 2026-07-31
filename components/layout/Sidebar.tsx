"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Truck, Users, History, Settings, CalendarDays, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useFotoPerfil } from "@/lib/useFotoPerfil";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, rolesPermitidos: ["ADMIN", "RECEPCIONISTA"] },
  { href: "/transfers", label: "Traslados", icon: Truck, rolesPermitidos: ["ADMIN", "RECEPCIONISTA"] },
  { href: "/patients", label: "Pacientes", icon: Users, rolesPermitidos: ["ADMIN", "RECEPCIONISTA"] },
  {
    href: "/calendar",
    label: "Calendario",
    icon: CalendarDays,
    rolesPermitidos: ["ADMIN", "RECEPCIONISTA", "CHOFER"],
  },
  { href: "/history", label: "Historial", icon: History, rolesPermitidos: ["ADMIN", "RECEPCIONISTA"] },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  RECEPCIONISTA: "Recepción",
  CHOFER: "Chofer",
};

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const fotoUrl = useFotoPerfil();
  const nombre = session?.user?.name ?? "";
  const rolActual = session?.user?.rol;
  const rol = rolActual ? ROL_LABEL[rolActual] : "";
  const navItems = NAV_ITEMS.filter((item) => !item.rolesPermitidos || item.rolesPermitidos.includes(rolActual ?? ""));

  return (
    <aside className={`sidebar${open ? " sidebar--open" : ""}`}>
      <div className="sidebar-brand">
        <Image src="/logo.png" alt="MediTraslado" width={32} height={32} priority />
        <span className="sidebar-brand-name">
          Medi<span className="sidebar-brand-name-accent">Traslado</span>
        </span>
        {onClose && (
          <button type="button" className="sidebar-close-btn" aria-label="Cerrar menú" onClick={onClose}>
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item${active ? " sidebar-nav-item--active" : ""}`}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {nombre && (
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {fotoUrl ? <img src={fotoUrl} alt="" /> : iniciales(nombre)}
          </div>
          <div>
            <div className="sidebar-user-name">{nombre}</div>
            <div className="sidebar-user-role">{rol}</div>
          </div>
        </div>
      )}
    </aside>
  );
}
