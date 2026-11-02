import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner, serviceSupabase } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/server/http";
export async function GET(req: NextRequest) {
  try {
    await requireOwner();
    const id = z
      .string()
      .uuid()
      .parse(req.nextUrl.searchParams.get("appointment"));
    const { data, error } = await serviceSupabase()
      .from("appointment_events")
      .select("*")
      .eq("appointment_id", id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json(data ?? [], {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
