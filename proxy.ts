import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
export async function proxy(req: NextRequest) {
  let response = NextResponse.next({ request: req });
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return response;
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  await db.auth.getUser();
  return response;
}
export const config = {
  matcher: [
    "/inicio/:path*",
    "/calendario/:path*",
    "/clientes/:path*",
    "/disponibilidad/:path*",
    "/ajustes/:path*",
    "/notificaciones/:path*",
    "/mas/:path*",
    "/api/admin",
    "/api/push",
  ],
};
