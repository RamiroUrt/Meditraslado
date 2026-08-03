"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Label from "@/components/ui/Label/Label";
import Input from "@/components/ui/Input/Input";
import Button from "@/components/ui/Button/Button";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listo, setListo] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("El link no es válido, pedí uno nuevo");
      return;
    }
    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al restablecer la contraseña");
        return;
      }
      setListo(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Error de conexión, intentá de nuevo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-card" onSubmit={handleSubmit}>
      <div className="login-brand">
        <Image src="/logo.png" alt="MediTraslado" width={56} height={56} priority />
        <span className="login-brand-name">
          Medi<span className="login-brand-name-accent">Traslado</span>
        </span>
      </div>

      <div className="login-welcome">
        <h1 className="login-welcome-title">Nueva contraseña</h1>
        <p className="login-welcome-subtitle">Elegí una contraseña nueva para tu cuenta</p>
      </div>

      {listo ? (
        <p className="form-success">Contraseña actualizada. Te redirigimos al login...</p>
      ) : (
        <>
          <div className="login-field">
            <Label htmlFor="reset-password">Contraseña nueva</Label>
            <div className="login-password-wrap">
              <Input
                id="reset-password"
                type={mostrarPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setMostrarPassword((v) => !v)}
              >
                {mostrarPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="login-field">
            <Label htmlFor="reset-password-confirm">Confirmar contraseña</Label>
            <Input
              id="reset-password-confirm"
              type={mostrarPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              required
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <Button type="submit" variant="primary" loading={loading}>
            {loading ? "Guardando..." : "Restablecer contraseña"}
          </Button>
        </>
      )}

      <p className="login-footer-text">
        <Link href="/login" className="login-forgot">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-image-side" />

        <div className="login-form-side">
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
