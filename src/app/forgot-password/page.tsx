"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import Label from "@/components/ui/Label/Label";
import Input from "@/components/ui/Input/Input";
import Button from "@/components/ui/Button/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al procesar la solicitud");
        return;
      }
      setEnviado(true);
    } catch {
      setError("Error de conexión, intentá de nuevo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-image-side" />

        <div className="login-form-side">
          <form className="login-card" onSubmit={handleSubmit}>
            <div className="login-brand">
              <Image src="/logo.png" alt="MediTraslado" width={56} height={56} priority />
              <span className="login-brand-name">
                Medi<span className="login-brand-name-accent">Traslado</span>
              </span>
            </div>

            <div className="login-welcome">
              <h1 className="login-welcome-title">¿Olvidaste tu contraseña?</h1>
              <p className="login-welcome-subtitle">
                Ingresá tu email y te enviamos un link para restablecerla
              </p>
            </div>

            {enviado ? (
              <p className="form-success">
                Si el email existe, te enviamos un link para restablecer tu contraseña. Revisá tu bandeja de entrada.
              </p>
            ) : (
              <>
                <div className="login-field">
                  <Label htmlFor="forgot-email">Correo electrónico</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {error && <div className="form-error">{error}</div>}

                <Button type="submit" variant="primary" loading={loading}>
                  {loading ? "Enviando..." : "Enviar link"}
                </Button>
              </>
            )}

            <p className="login-footer-text">
              <Link href="/login" className="login-forgot">
                Volver a iniciar sesión
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
