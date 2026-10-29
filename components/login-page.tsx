"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Leaf, LockKeyhole, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { browserSupabase } from "@/lib/supabase/browser";
import { signInOwner } from "@/lib/auth";
export function LoginPage({
  configured,
  demo,
  error,
}: {
  configured: boolean;
  demo: boolean;
  error: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState(
    error
      ? "Este correo no tiene acceso. Ingresa con la cuenta autorizada."
      : "",
  );
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await signInOwner(browserSupabase(), { email, password }, async () => {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        if (response.status === 401 || response.status === 403) return false;
        if (!response.ok) throw new Error("Access check failed");
        return true;
      });
      setPassword("");
      router.replace("/inicio");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No pudimos ingresar. Inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page" id="main-content">
      <div className="login-art">
        <Brand href="/reservar" />
        <div>
          <span className="eyebrow">BIENVENIDA A TU ESPACIO</span>
          <h1>
            Tu tiempo,
            <br />
            <em>en buenas manos.</em>
          </h1>
          <p>
            Una agenda más simple.
            <br />
            Un día con más calma.
          </p>
          <Leaf size={50} strokeWidth={1} />
        </div>
        <small>LUISA · TU ESPACIO DE BIENESTAR</small>
      </div>
      <section className="login-panel">
        <div className="login-form">
          <span className="section-icon">
            <LockKeyhole size={27} />
          </span>
          <h2>Qué bueno verte</h2>
          <p>
            Entra a tu espacio para organizar tus citas y cuidar de tus
            clientes.
          </p>
          {message && (
            <p role="alert" className="form-error">
              {message}
            </p>
          )}
          {configured ? (
            <form className="stack-form password-login-form" onSubmit={login}>
              <label htmlFor="login-email">
                Tu correo
                <input
                  id="login-email"
                  name="username"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={254}
                  required
                  disabled={busy}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Tu correo de acceso"
                />
              </label>
              <label htmlFor="login-password">
                Tu contraseña
                <div className="password-field">
                  <input
                    id="login-password"
                    name="password"
                    type={visible ? "text" : "password"}
                    autoComplete="current-password"
                    maxLength={1024}
                    required
                    disabled={busy}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Escribe tu contraseña"
                  />
                  <button
                    type="button"
                    className="password-toggle icon-button"
                    aria-label={
                      visible ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    aria-pressed={visible}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeOff size={21} /> : <Eye size={21} />}
                  </button>
                </div>
              </label>
              <p className="field-help login-session-help">
                Tu sesión quedará abierta en este dispositivo hasta que la
                cierres.
              </p>
              <Button type="submit" loading={busy} disabled={busy}>
                {busy ? "Ingresando…" : "Entrar a mi espacio"}
                <ArrowRight size={19} />
              </Button>
            </form>
          ) : (
            <div className="note-box">
              La aplicación aún necesita conectarse a Supabase. Sigue los pasos
              del README para activar el acceso privado.
            </div>
          )}
          {demo && (
            <Button variant="outline" asChild>
              <Link href="/inicio">
                Explorar la demostración
                <ArrowRight size={18} />
              </Link>
            </Button>
          )}
          <p className="field-help">
            <LockKeyhole size={15} /> Este acceso es solo para la dueña del
            negocio.
          </p>
          <Link className="subtle-link" href="/reservar">
            ¿Quieres reservar una cita? <ArrowUpRightIcon />
          </Link>
        </div>
      </section>
    </main>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={17} />;
}
