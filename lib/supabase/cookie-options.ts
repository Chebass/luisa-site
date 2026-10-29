// Match Supabase SSR's persistent-cookie lifetime, renewed with each token refresh.
export const authCookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  maxAge: 400 * 24 * 60 * 60,
  secure: process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") === true,
};
