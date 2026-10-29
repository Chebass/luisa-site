"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Leaf, LockKeyhole } from "lucide-react";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { browserSupabase } from "@/lib/supabase/browser";
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
  const [message, setMessage] = useState(
    error
      ? "Este correo no tiene acceso. Ingresa con la cuenta autorizada."
      : "",
  );
  async function login() {
    setBusy(true);
    setMessage("");
    try {
      const { error } = await browserSupabase().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch {
      setMessage("No pudimos abrir Google. Inténtalo otra vez.");
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
            <Button onClick={login} disabled={busy}>
              {busy ? "Abriendo Google…" : "Continuar con Google"}
              <ArrowRight size={19} />
            </Button>
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
