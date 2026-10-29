import "server-only";
import webpush from "web-push";
import { serviceSupabase } from "@/lib/supabase/server";
export async function sendPush(title: string) {
  if (
    !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY ||
    !process.env.VAPID_SUBJECT
  )
    return;
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
    const { data } = await serviceSupabase()
      .from("push_subscriptions")
      .select("*");
    await Promise.allSettled(
      (data ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({
              title,
              body: "Abre tu agenda para ver los detalles.",
              url: "/notificaciones",
            }),
            { TTL: 3600 },
          );
        } catch (e) {
          if ([404, 410].includes((e as { statusCode: number }).statusCode))
            await serviceSupabase()
              .from("push_subscriptions")
              .delete()
              .eq("id", s.id);
        }
      }),
    );
  } catch {
    console.error("Push delivery failed");
  }
}
