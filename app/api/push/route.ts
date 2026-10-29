import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner, serviceSupabase } from "@/lib/supabase/server";
import { errorResponse, verifyRequest } from "@/lib/server/http";
export async function POST(req: NextRequest) {
  try {
    verifyRequest(req);
    await requireOwner();
    const v = z
      .object({
        endpoint: z.url().startsWith("https://"),
        keys: z.object({
          p256dh: z.string().min(20).max(500),
          auth: z.string().min(10).max(500),
        }),
      })
      .parse(await req.json());
    const url = new URL(v.endpoint);
    if (
      ![
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
        "web.push.apple.com",
      ].includes(url.hostname) &&
      !url.hostname.endsWith(".notify.windows.com")
    )
      return NextResponse.json(
        { error: "Servicio de notificaciones no admitido." },
        { status: 400 },
      );
    const { error } = await serviceSupabase()
      .from("push_subscriptions")
      .upsert({ endpoint: v.endpoint, ...v.keys }, { onConflict: "endpoint" });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
