import { NextRequest, NextResponse } from "next/server";
import { isConfigured, serviceSupabase } from "@/lib/supabase/server";
import { bookingSchema } from "@/lib/validation";
import {
  errorResponse,
  phoneRateLimit,
  rateLimit,
  verifyCaptcha,
  verifyRequest,
} from "@/lib/server/http";
import { loadSettings } from "@/lib/server/data";
import { appointmentMessage, whatsappLink } from "@/lib/whatsapp";
import { defaultTemplates } from "@/lib/templates";
import { sendPush } from "@/lib/server/push";
export async function POST(req: NextRequest) {
  try {
    verifyRequest(req);
    if (!isConfigured()) throw new Error("CONFIGURATION");
    await rateLimit(req, "booking", 10);
    const b = bookingSchema.parse(await req.json());
    await verifyCaptcha(b.turnstile);
    await phoneRateLimit(b.phone);
    const settings = await loadSettings();
    if (!settings.owner_phone) throw new Error("CONFIGURATION");
    const db = serviceSupabase();
    const { data, error } = await db.rpc("create_booking", {
      p_name: b.name,
      p_phone: b.phone,
      p_start: b.start_at,
      p_note: b.service_note,
      p_owner: false,
    });
    if (error) throw error;
    const { data: template } = await db
      .from("message_templates")
      .select("body")
      .eq("key", "reserva_cliente")
      .maybeSingle();
    const message = appointmentMessage(
      template?.body ?? defaultTemplates.reserva_cliente,
      data,
      settings,
      process.env.NEXT_PUBLIC_APP_URL!,
      b.name,
    );
    await sendPush("Nueva cita reservada");
    return NextResponse.json(
      {
        start_at: data.start_at,
        end_at: data.end_at,
        whatsapp: whatsappLink(settings.owner_phone, message),
      },
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
