import "server-only";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { serviceSupabase } from "@/lib/supabase/server";
export function errorResponse(error: unknown) {
  const e = error as { message?: string; code?: string };
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Revisa los datos." },
      { status: 400 },
    );
  if (e.message === "UNAUTHORIZED")
    return NextResponse.json(
      { error: "Vuelve a iniciar sesión." },
      { status: 401 },
    );
  if (e.message === "CONFIGURATION")
    return NextResponse.json(
      {
        error:
          "Falta conectar la aplicación. Revisa la configuración del servidor.",
      },
      { status: 503 },
    );
  if (e.code === "23P01")
    return NextResponse.json(
      {
        error: e.message?.includes("BLOCK_CONFLICT")
          ? "Tienes citas en ese horario. Muévelas o cancélalas antes de bloquearlo."
          : "Ese horario ya no está disponible, elige otro.",
      },
      { status: 409 },
    );
  if (e.code === "23505")
    return NextResponse.json(
      {
        error:
          "Ese teléfono ya pertenece a otro cliente. Busca su ficha en Clientes.",
      },
      { status: 409 },
    );
  if (e.message?.includes("TOO_LATE"))
    return NextResponse.json(
      {
        error:
          "Ya no puedes hacer este cambio desde el enlace. Comunícate con Luisa por WhatsApp.",
      },
      { status: 400 },
    );
  if (e.message?.includes("TOKEN_EXPIRED") || e.message?.includes("NOT_FOUND"))
    return NextResponse.json(
      { error: "Este enlace venció o no existe." },
      { status: 404 },
    );
  if (e.message?.includes("INVALID_STATE"))
    return NextResponse.json(
      { error: "Esta cita ya no se puede cambiar." },
      { status: 400 },
    );
  if (e.message === "RATE_LIMIT")
    return NextResponse.json(
      { error: "Has hecho varios intentos. Espera unos minutos." },
      { status: 429 },
    );
  if (
    ["BAD_ORIGIN", "BOT_REQUEST", "CAPTCHA", "INVALID_TOKEN"].includes(
      e.message ?? "",
    )
  )
    return NextResponse.json(
      {
        error:
          "No se pudo verificar la solicitud. Actualiza la página e inténtalo otra vez.",
      },
      { status: 400 },
    );
  console.error("Request failed", e.code ?? "unknown");
  return NextResponse.json(
    { error: "No pudimos completar la acción. Inténtalo de nuevo." },
    { status: 500 },
  );
}
export function verifyRequest(req: NextRequest) {
  const origin = req.headers.get("origin");
  const expected = new URL(process.env.NEXT_PUBLIC_APP_URL ?? req.url).origin;
  if (origin !== expected || req.headers.get("x-luisa-app") !== "1")
    throw new Error("BAD_ORIGIN");
  if (
    /bot|crawler|spider|facebookexternalhit|WhatsApp\//i.test(
      req.headers.get("user-agent") ?? "",
    )
  )
    throw new Error("BOT_REQUEST");
}
export async function rateLimit(
  req: NextRequest,
  scope: string,
  limit = 20,
  seconds = 600,
) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = createHash("sha256").update(`${scope}:${ip}`).digest("hex");
  const { data, error } = await serviceSupabase().rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_seconds: seconds,
  });
  if (error) throw error;
  if (!data) throw new Error("RATE_LIMIT");
}
export async function phoneRateLimit(phone: string) {
  const key = createHash("sha256").update(`phone:${phone}`).digest("hex");
  const { data, error } = await serviceSupabase().rpc("consume_rate_limit", {
    p_key: key,
    p_limit: 5,
    p_seconds: 3600,
  });
  if (error) throw error;
  if (!data) throw new Error("RATE_LIMIT");
}
export async function verifyCaptcha(token?: string) {
  if (!process.env.TURNSTILE_SECRET_KEY || !token) throw new Error("CAPTCHA");
  const r = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
      signal: AbortSignal.timeout(10000),
    },
  );
  const result = await r.json();
  const expected = new URL(process.env.NEXT_PUBLIC_APP_URL!).hostname;
  if (!result.success || result.hostname !== expected)
    throw new Error("CAPTCHA");
}
