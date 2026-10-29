import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { serviceSupabase, isConfigured } from "@/lib/supabase/server";
import { errorResponse, rateLimit, verifyRequest } from "@/lib/server/http";
import { loadSettings } from "@/lib/server/data";
import { appointmentMessage, whatsappLink } from "@/lib/whatsapp";
import { defaultTemplates } from "@/lib/templates";
import { sendPush } from "@/lib/server/push";
type Context = { params: Promise<{ token: string }> };
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export async function GET(req: NextRequest, { params }: Context) {
  try {
    if (!isConfigured()) throw new Error("CONFIGURATION");
    await rateLimit(req, "token-read", 60);
    const { token } = await params;
    tokenSchema.parse(token);
    const { data, error } = await serviceSupabase()
      .from("appointments")
      .select("start_at,end_at,status")
      .eq("action_token", token)
      .single();
    if (error || !data || new Date(data.end_at) <= new Date())
      throw new Error("NOT_FOUND");
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: NextRequest, { params }: Context) {
  try {
    verifyRequest(req);
    if (!isConfigured()) throw new Error("CONFIGURATION");
    await rateLimit(req, "token-action", 20);
    const { token } = await params;
    tokenSchema.parse(token);
    const body = z
      .object({
        action: z.enum(["confirm", "cancel", "move"]),
        start_at: z.iso.datetime({ offset: true }).optional(),
      })
      .parse(await req.json());
    const settings = await loadSettings();
    if (!settings.owner_phone) throw new Error("CONFIGURATION");
    const db = serviceSupabase();
    const { data, error } = await db.rpc("change_appointment", {
      p_token: token,
      p_action: body.action,
      p_start: body.start_at ?? null,
      p_owner: false,
    });
    if (error) throw error;
    const key = {
      confirm: "confirmada_cliente",
      cancel: "cancelada_cliente",
      move: "modificada_cliente",
    }[body.action];
    const { data: template } = await db
      .from("message_templates")
      .select("body")
      .eq("key", key)
      .maybeSingle();
    const message = appointmentMessage(
      template?.body ?? defaultTemplates[key],
      data,
      settings,
      process.env.NEXT_PUBLIC_APP_URL!,
      "",
      data.previous_start,
    );
    if (!data.already)
      await sendPush(
        body.action === "cancel"
          ? "Una cita fue cancelada"
          : body.action === "confirm"
            ? "Una cita fue confirmada"
            : "Una cita cambió de horario",
      );
    return NextResponse.json(
      {
        start_at: data.start_at,
        end_at: data.end_at,
        status: data.status,
        already: data.already,
        whatsapp: whatsappLink(settings.owner_phone, message),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
