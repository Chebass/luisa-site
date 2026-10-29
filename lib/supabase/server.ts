import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { authCookieOptions } from "./cookie-options";
export const isConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.OWNER_EMAIL,
  );
export const isDemo = () =>
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
  !isConfigured();
export async function sessionSupabase() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: authCookieOptions,
      cookies: {
        getAll: () => jar.getAll(),
        setAll(values) {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Server components cannot refresh cookies; proxy handles it. */
          }
        },
      },
    },
  );
}
export function serviceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function requireOwner() {
  if (!isConfigured()) throw new Error("CONFIGURATION");
  const supabase = await sessionSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (
    error ||
    !user ||
    user.email?.toLowerCase() !== process.env.OWNER_EMAIL?.toLowerCase()
  )
    throw new Error("UNAUTHORIZED");
  return user;
}
