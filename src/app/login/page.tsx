"use client";

import { Suspense, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import Label from "@/components/ui/Label/Label";
import Input from "@/components/ui/Input/Input";
import Button from "@/components/ui/Button/Button";
import Checkbox from "@/components/ui/Checkbox/Checkbox";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recordarme, setRecordarme] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email o contraseña incorrectos");
      return;
    }

    router.push(searchParams.get("callbackUrl") ?? "/dashboard");
    router.refresh();
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
        <h1 className="login-welcome-title">Bienvenido</h1>
        <p className="login-welcome-subtitle">Iniciá sesión para continuar</p>
      </div>

      <div className="login-field">
        <Label htmlFor="login-email">Correo electrónico</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="login-field">
        <Label htmlFor="login-password">Contraseña</Label>
        <div className="login-password-wrap">
          <Input
            id="login-password"
            type={mostrarPassword ? "text" : "password"}
            autoComplete="current-password"
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

      <div className="login-options">
        <Checkbox
          id="login-recordarme"
          label="Recordarme"
          checked={recordarme}
          onChange={(e) => setRecordarme(e.target.checked)}
        />
        <Link href="/forgot-password" className="login-forgot">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      {error && <div className="form-error">{error}</div>}

      <Button type="submit" variant="primary" loading={loading}>
        {loading ? "Ingresando..." : "Iniciar sesión"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-image-side" />

        <div className="login-form-side">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
