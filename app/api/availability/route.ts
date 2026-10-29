import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isConfigured, serviceSupabase } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/server/data";
import { errorResponse, rateLimit } from "@/lib/server/http";
import { availableSlots } from "@/lib/availability";
import { localInstant, shiftDay } from "@/lib/dates";
export async function GET(req: NextRequest) {
  try {
    if (!isConfigured()) throw new Error("CONFIGURATION");
    await rateLimit(req, "slots", 120, 600);
    const day = z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .parse(req.nextUrl.searchParams.get("day"));
    const token = req.nextUrl.searchParams.get("token");
    const db = serviceSupabase();
    const settings = await loadSettings();
    const rangeStart = localInstant(day, "00:00").toISOString();
    const rangeEnd = localInstant(shiftDay(day, 1), "00:00").toISOString();
    const [rules, blocks, appointments] = await Promise.all([
      db.from("fixed_rules").select("*"),
      db
        .from("blocks")
        .select("id,start_at,end_at,reason")
        .lt("start_at", rangeEnd)
        .gt("end_at", rangeStart),
      db
        .from("appointments")
        .select("id,start_at,end_at,status")
        .in("status", ["scheduled", "confirmed"])
        .lt("start_at", rangeEnd)
        .gt("end_at", rangeStart),
    ]);
    for (const r of [rules, blocks, appointments]) if (r.error) throw r.error;
    let excludeId: string | undefined;
    let durationMinutes: number | undefined;
    if (token) {
      const { data, error } = await db
        .from("appointments")
        .select("id,end_at,start_at,status")
        .eq(
          "action_token",
          z
            .string()
            .regex(/^[A-Za-z0-9_-]{43}$/)
            .parse(token),
        )
        .single();
      if (error || !data || new Date(data.end_at) < new Date())
        throw new Error("NOT_FOUND");
      excludeId = data.id;
      if (!["scheduled", "confirmed"].includes(data.status))
        throw new Error("INVALID_STATE");
      if (
        new Date(data.start_at).getTime() <
        Date.now() + settings.change_notice_hours * 3600000
      )
        throw new Error("TOO_LATE");
      durationMinutes =
        (+new Date(data.end_at) - +new Date(data.start_at)) / 60000;
    }
    return NextResponse.json(
      {
        slots: availableSlots({
          day,
          settings,
          rules: rules.data ?? [],
          blocks: blocks.data ?? [],
          appointments: appointments.data ?? [],
          excludeId,
          durationMinutes,
        }),
        settings: {
          slot_minutes: settings.slot_minutes,
          booking_window_days: settings.booking_window_days,
          min_notice_hours: settings.min_notice_hours,
          owner_name: settings.owner_name,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
