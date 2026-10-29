import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Escribe un correo válido.")),
  password: z
    .string()
    .min(1, "Escribe tu contraseña.")
    .max(1024, "Revisa tu contraseña."),
});

function loginError(error: { status?: number; code?: string }) {
  if (error.status === 429)
    return "Has hecho varios intentos. Espera un momento y vuelve a probar.";
  if (error.code === "email_not_confirmed")
    return "Tu cuenta aún no está habilitada. Comunícate con quien configuró la app.";
  if (error.status === 0 || error.code === "unexpected_failure")
    return "No pudimos conectar. Revisa tu conexión y vuelve a intentarlo.";
  return "No pudimos ingresar. Revisa tu correo y contraseña.";
}

/** Supabase stores the password hash and issues JWT/refresh tokens; the app never stores passwords. */
export async function signInOwner(
  client: SupabaseClient,
  credentials: unknown,
  verifyAccess: () => Promise<boolean>,
) {
  const result = credentialsSchema.safeParse(credentials);
  if (!result.success) throw new Error(result.error.issues[0].message);
  const { error } = await client.auth.signInWithPassword(result.data);
  if (error) throw new Error(loginError(error));
  let allowed = false;
  try {
    allowed = await verifyAccess();
  } catch {
    await client.auth.signOut({ scope: "local" });
    throw new Error(
      "No pudimos comprobar el acceso. Revisa tu conexión y vuelve a intentarlo.",
    );
  }
  if (!allowed) {
    await client.auth.signOut({ scope: "local" });
    throw new Error("No pudimos ingresar. Revisa tu correo y contraseña.");
  }
}

/** Each device retains its own session; never use the SDK's global sign-out default. */
export async function signOutCurrentDevice(client: SupabaseClient) {
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error)
    throw new Error(
      "No pudimos cerrar sesión. Revisa tu conexión y vuelve a intentarlo.",
    );
}
