import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner, serviceSupabase } from "@/lib/supabase/server";
import { loadStore } from "@/lib/server/data";
import { errorResponse, verifyRequest } from "@/lib/server/http";
import {
  blockSchema,
  bookingSchema,
  clientSchema,
  ruleSchema,
  settingsSchema,
} from "@/lib/validation";
import { sendPush } from "@/lib/server/push";
export async function GET() {
  try {
    await requireOwner();
    return NextResponse.json(await loadStore(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    verifyRequest(req);
    await requireOwner();
    const input = await req.json();
    const db = serviceSupabase();
    let result: unknown = null;
    switch (input.kind) {
      case "booking": {
        const b = bookingSchema.parse(input.value);
        const { data, error } = await db.rpc("create_booking", {
          p_name: b.name,
          p_phone: b.phone,
          p_start: b.start_at,
          p_note: b.service_note,
          p_owner: true,
          p_override: b.override_blocks ?? false,
        });
        if (error) throw error;
        result = data;
        break;
      }
      case "appointment": {
        const v = z
          .object({
            id: z.string().uuid(),
            action: z.enum([
              "confirm",
              "cancel",
              "move",
              "complete",
              "no_show",
              "remind",
              "notice",
              "note",
            ]),
            start_at: z.iso.datetime({ offset: true }).optional(),
            service_note: z.string().max(500).optional(),
            override_blocks: z.boolean().optional(),
          })
          .parse(input.value);
        const { data, error } = await db.rpc("change_appointment", {
          p_id: v.id,
          p_action: v.action,
          p_start: v.start_at ?? null,
          p_note: v.service_note ?? null,
          p_owner: true,
          p_override: v.override_blocks ?? false,
        });
        if (error) throw error;
        result = data;
        break;
      }
      case "client": {
        const v = clientSchema.parse(input.value);
        const { error } = await db
          .from("clients")
          .upsert({ ...v, source: "owner" }, { onConflict: "id" });
        if (error) throw error;
        break;
      }
      case "settings": {
        const v = settingsSchema.parse(input.value);
        const { error } = await db.from("settings").update(v).eq("id", 1);
        if (error) throw error;
        break;
      }
      case "block":
      case "rule": {
        const value = input.remove
          ? z.object({ id: z.string().uuid() }).parse(input.value)
          : (input.kind === "block" ? blockSchema : ruleSchema).parse(
              input.value,
            );
        const { error } = await db.rpc("save_unavailability", {
          p_kind: input.kind,
          p_value: value,
          p_delete: Boolean(input.remove),
        });
        if (error) throw error;
        break;
      }
      case "templates": {
        const v = z
          .record(z.string().min(1).max(80), z.string().min(1).max(3000))
          .parse(input.value);
        const { error } = await db.from("message_templates").upsert(
          Object.entries(v).map(([key, body]) => ({
            key,
            body,
            updated_at: new Date().toISOString(),
          })),
        );
        if (error) throw error;
        break;
      }
      case "read": {
        const { error } = await db
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .is("read_at", null);
        if (error) throw error;
        break;
      }
      default:
        return NextResponse.json(
          { error: "Acción desconocida." },
          { status: 400 },
        );
    }
    if (input.kind === "booking") await sendPush("Nueva cita");
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return errorResponse(e);
  }
}
