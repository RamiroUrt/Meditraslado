"use client";

import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useFotoPerfil } from "@/lib/useFotoPerfil";

const PAGE_TITLE: Record<string, string> = {
  "/dashboard": "Panel de Control",
  "/patients": "Pacientes",
  "/transfers": "Traslados",
  "/calendar": "Calendario",
  "/history": "Historial",
  "/settings": "Ajustes",
};

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  RECEPCIONISTA: "Recepción",
  CHOFER: "Chofer",
};

function getPageTitle(pathname: string) {
  const match = Object.keys(PAGE_TITLE).find((key) => pathname.startsWith(key));
  return match ? PAGE_TITLE[match] : "Panel de Control";
}

function getFechaHoy() {
  const formatted = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const fotoUrl = useFotoPerfil();
  const nombre = session?.user?.name ?? "";
  const rol = session?.user?.rol ? ROL_LABEL[session.user.rol] : "";
  const centroNombre = session?.user?.centroNombre ?? (session?.user?.rol === "ADMIN" ? "Admin" : "");

  return (
    <header className="header">
      <div className="header-left">
        <button type="button" className="header-menu-btn" aria-label="Abrir menú" onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <div>
          <h1 className="header-title">{getPageTitle(pathname)}</h1>
          <span className="header-date">{getFechaHoy()}</span>
        </div>
      </div>

      <div className="header-right">
        {centroNombre && <span className="header-centro-badge">{centroNombre}</span>}

        {nombre && (
          <div className="header-user">
            <div className="header-user-avatar">
              {fotoUrl ? <img src={fotoUrl} alt="" /> : iniciales(nombre)}
              <span className="header-user-online" />
            </div>
            <div className="header-user-text">
              <div className="header-user-name">{nombre}</div>
              <div className="header-user-role">{rol}</div>
            </div>
          </div>
        )}

        <button
          className="header-icon-btn"
          aria-label="Cerrar sesión"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
