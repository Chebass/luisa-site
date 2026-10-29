import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/server/http";
export async function GET() {
  try {
    await requireOwner();
    return NextResponse.json(
      { authenticated: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
