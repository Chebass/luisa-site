import { createBrowserClient } from "@supabase/ssr";
import { authCookieOptions } from "./cookie-options";
export function browserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: authCookieOptions,
      auth: { persistSession: true, autoRefreshToken: true },
    },
  );
}
