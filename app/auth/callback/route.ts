import { NextRequest, NextResponse } from "next/server";
import { sessionSupabase } from "@/lib/supabase/server";
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const origin = new URL(process.env.NEXT_PUBLIC_APP_URL ?? req.url).origin;
  if (code) {
    const db = await sessionSupabase();
    const { error } = await db.auth.exchangeCodeForSession(code);
    const {
      data: { user },
    } = await db.auth.getUser();
    if (
      !error &&
      user?.email?.toLowerCase() === process.env.OWNER_EMAIL?.toLowerCase()
    )
      return NextResponse.redirect(`${origin}/inicio`);
    await db.auth.signOut();
  }
  return NextResponse.redirect(`${origin}/login?error=access`);
}
