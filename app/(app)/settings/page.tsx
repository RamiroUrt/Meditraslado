"use client";

import { useEffect, useState, useSyncExternalStore, type ChangeEvent, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { Sun, Moon } from "lucide-react";
import Label from "@/components/ui/Label";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { cambiarPassword, actualizarPerfil, fetchPerfil } from "@/lib/api-client";
import { notificarCambioFoto } from "@/lib/useFotoPerfil";

const FOTO_MAX_BYTES = 700_000;

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

type Tema = "dark" | "light";

const STORAGE_KEY = "meditraslado-theme";
const THEME_CHANGE_EVENT = "meditraslado-theme-change";

function subscribe(callback: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, callback);
}

function getSnapshot(): Tema {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function getServerSnapshot(): Tema {
  return "dark";
}

function setTema(tema: Tema) {
  document.documentElement.setAttribute("data-theme", tema);
  window.localStorage.setItem(STORAGE_KEY, tema);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  RECEPCIONISTA: "Recepción",
  CHOFER: "Chofer",
};

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const tema = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const [perfilCargado, setPerfilCargado] = useState(false);
  const [nombreForm, setNombreForm] = useState("");
  const [emailForm, setEmailForm] = useState("");
  const [fotoActual, setFotoActual] = useState<string | null>(null);
  const [fotoNueva, setFotoNueva] = useState<string | null | undefined>(undefined);
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);
  const [exitoPerfil, setExitoPerfil] = useState(false);

  if (session?.user && !perfilCargado) {
    setNombreForm(session.user.name ?? "");
    setEmailForm(session.user.email ?? "");
    setPerfilCargado(true);
  }

  useEffect(() => {
    fetchPerfil()
      .then((p) => setFotoActual(p.fotoUrl))
      .catch(() => {});
  }, []);

  function handleFotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > FOTO_MAX_BYTES) {
      setErrorPerfil("La imagen es demasiado grande (máx. ~500 KB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFotoNueva(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleQuitarFoto() {
    setFotoNueva(null);
  }

  const fotoMostrada = fotoNueva !== undefined ? fotoNueva : fotoActual;

  async function handleSubmitPerfil(e: FormEvent) {
    e.preventDefault();
    setErrorPerfil(null);
    setExitoPerfil(false);
    setSavingPerfil(true);
    try {
      const guardado = await actualizarPerfil(nombreForm.trim(), emailForm.trim(), fotoNueva);
      await update({ name: guardado.nombre, email: guardado.email });
      setFotoActual(guardado.fotoUrl);
      setFotoNueva(undefined);
      notificarCambioFoto();
      setExitoPerfil(true);
    } catch (err) {
      setErrorPerfil(err instanceof Error ? err.message : "No se pudo actualizar el perfil");
    } finally {
      setSavingPerfil(false);
    }
  }

  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setExito(false);

    if (passwordNueva !== passwordConfirmar) {
      setError("Las contraseñas nuevas no coinciden");
      return;
    }

    setSaving(true);
    try {
      await cambiarPassword(passwordActual, passwordNueva);
      setExito(true);
      setPasswordActual("");
      setPasswordNueva("");
      setPasswordConfirmar("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-page">
      <h1 className="patients-title">Ajustes</h1>

      <section className="settings-section">
        <h2 className="settings-section-title">Apariencia</h2>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Tema</div>
            <div className="settings-row-desc">Elegí cómo se ve la aplicación</div>
          </div>
          <div className="settings-theme-toggle">
            <button
              type="button"
              className={`settings-theme-option${tema === "light" ? " settings-theme-option--active" : ""}`}
              onClick={() => setTema("light")}
            >
              <Sun size={15} />
              Claro
            </button>
            <button
              type="button"
              className={`settings-theme-option${tema === "dark" ? " settings-theme-option--active" : ""}`}
              onClick={() => setTema("dark")}
            >
              <Moon size={15} />
              Oscuro
            </button>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-section-title">Cuenta</h2>
        <form className="patients-modal-form" onSubmit={handleSubmitPerfil}>
          <div className="settings-foto-row">
            <div className="settings-foto-avatar">
              {fotoMostrada ? <img src={fotoMostrada} alt="" /> : iniciales(nombreForm || "?")}
            </div>
            <div className="settings-foto-actions">
              <label className="btn btn--secondary settings-foto-upload">
                Subir foto
                <input type="file" accept="image/*" onChange={handleFotoChange} hidden />
              </label>
              {fotoMostrada && (
                <Button type="button" variant="secondary" onClick={handleQuitarFoto}>
                  Quitar foto
                </Button>
              )}
            </div>
          </div>

          <div className="patients-modal-row">
            <div className="patients-modal-field">
              <Label htmlFor="st-nombre">Nombre</Label>
              <Input id="st-nombre" value={nombreForm} onChange={(e) => setNombreForm(e.target.value)} required />
            </div>
            <div className="patients-modal-field">
              <Label htmlFor="st-email">Email</Label>
              <Input
                id="st-email"
                type="email"
                value={emailForm}
                onChange={(e) => setEmailForm(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="settings-row">
            <span className="settings-row-label">Rol</span>
            <span className="settings-row-value">{session?.user?.rol ? ROL_LABEL[session.user.rol] : ""}</span>
          </div>
          {session?.user?.centroNombre && (
            <div className="settings-row">
              <span className="settings-row-label">Centro</span>
              <span className="settings-row-value">{session.user.centroNombre}</span>
            </div>
          )}

          {errorPerfil && <div className="form-error">{errorPerfil}</div>}
          {exitoPerfil && <div className="form-success">Perfil actualizado correctamente</div>}

          <div className="patients-modal-footer">
            <Button type="submit" variant="primary" loading={savingPerfil}>
              {savingPerfil ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </section>

      <section className="settings-section">
        <h2 className="settings-section-title">Seguridad</h2>
        <form className="patients-modal-form" onSubmit={handleSubmit}>
          <div className="patients-modal-field">
            <Label htmlFor="st-actual">Contraseña actual</Label>
            <Input
              id="st-actual"
              type="password"
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              required
            />
          </div>

          <div className="patients-modal-row">
            <div className="patients-modal-field">
              <Label htmlFor="st-nueva">Contraseña nueva</Label>
              <Input
                id="st-nueva"
                type="password"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="patients-modal-field">
              <Label htmlFor="st-confirmar">Confirmar contraseña</Label>
              <Input
                id="st-confirmar"
                type="password"
                value={passwordConfirmar}
                onChange={(e) => setPasswordConfirmar(e.target.value)}
                minLength={6}
                required
              />
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}
          {exito && <div className="form-success">Contraseña actualizada correctamente</div>}

          <div className="patients-modal-footer">
            <Button type="submit" variant="primary" loading={saving}>
              {saving ? "Guardando..." : "Cambiar contraseña"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
