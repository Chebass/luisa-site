import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

/** Validate names and settings without printing credentials or calling services. */
export function inspectConfiguration(env, production = false) {
  const errors = [];
  const warnings = [];
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OWNER_EMAIL",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    "TURNSTILE_SECRET_KEY",
  ];
  for (const key of required) {
    if (!env[key]?.trim()) errors.push(`Falta ${key}.`);
  }
  for (const key of ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SUPABASE_URL"]) {
    if (!env[key]) continue;
    try {
      const url = new URL(env[key]);
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if (
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== "/" ||
        (url.protocol !== "https:" &&
          !(local && !production && url.protocol === "http:")) ||
        (production && local)
      )
        errors.push(
          `${key} debe ser un origen ${production ? "HTTPS público" : "HTTPS o localhost"}, sin rutas ni credenciales.`,
        );
    } catch {
      errors.push(`${key} no es una URL válida.`);
    }
  }
  if (env.OWNER_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.OWNER_EMAIL)) {
    errors.push("OWNER_EMAIL debe ser el correo autorizado de Supabase Auth.");
  }
  if (production) {
    if (env.NEXT_PUBLIC_DEMO_MODE !== "false") {
      errors.push("En producción, NEXT_PUBLIC_DEMO_MODE debe ser false.");
    }
    for (const key of [
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
      "TURNSTILE_SECRET_KEY",
    ]) {
      if (/^[123]x0+[A-Z]{2}$/.test(env[key] ?? "")) {
        errors.push(
          `${key} usa una clave de prueba; producción requiere un widget real.`,
        );
      }
    }
  }
  const pushKeys = [
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_SUBJECT",
  ];
  const hasPublic = Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim());
  const hasPrivate = Boolean(env.VAPID_PRIVATE_KEY?.trim());
  if (hasPublic || hasPrivate) {
    for (const key of pushKeys) {
      if (!env[key]?.trim())
        errors.push(`Completa ${key} para habilitar Web Push.`);
    }
    if (
      env.VAPID_SUBJECT &&
      !/^(mailto:[^\s@]+@[^\s@]+\.[^\s@]+|https:\/\/\S+)$/.test(
        env.VAPID_SUBJECT,
      )
    ) {
      errors.push(
        "VAPID_SUBJECT debe ser un mailto: o una URL HTTPS de contacto.",
      );
    }
  } else {
    warnings.push(
      "Web Push pendiente; las reservas y los avisos dentro de la app pueden funcionar sin él.",
    );
  }
  return { errors, warnings };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const production = process.argv.includes("--production");
  // Resolve the env loader through Next.js, whose dependency supplies it.
  const require = createRequire(import.meta.url);
  const nextRequire = createRequire(require.resolve("next/package.json"));
  const { loadEnvConfig } = nextRequire("@next/env");
  loadEnvConfig(process.cwd(), !production, { info() {}, error() {} });
  const { errors, warnings } = inspectConfiguration(process.env, production);
  for (const warning of warnings) console.log(`Aviso: ${warning}`);
  for (const error of errors) console.error(`Error: ${error}`);
  if (errors.length) {
    console.error(
      "Configuración incompleta. Revisa la guía de despliegue del README.",
    );
    process.exitCode = 1;
  } else {
    console.log(
      `Configuración ${production ? "de producción" : "local"} completa. Falta verificar dominios, base de datos y reservas en el entorno real.`,
    );
  }
}
