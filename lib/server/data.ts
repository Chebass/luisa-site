import "server-only";
import { serviceSupabase } from "@/lib/supabase/server";
import type { Settings, Store } from "@/lib/types";
import { defaultTemplates } from "@/lib/templates";
export async function loadSettings(): Promise<Settings> {
  const { data, error } = await serviceSupabase()
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return {
    ...data,
    visible_start: data.visible_start.slice(0, 5),
    visible_end: data.visible_end.slice(0, 5),
  };
}
const NOTICE_LIMIT = 50;
export async function loadStore(): Promise<Store> {
  const db = serviceSupabase();
  const tables = [
    "clients",
    "appointments",
    "fixed_rules",
    "blocks",
    "message_templates",
  ] as const;
  async function readAll(t: (typeof tables)[number]) {
    const order =
      t === "message_templates"
        ? "key"
        : t === "fixed_rules"
          ? "weekday"
          : "created_at";
    const query = () =>
      db
        .from(t)
        .select("*")
        .order(order, { ascending: false })
        .order(t === "message_templates" ? "key" : "id");
    const first = await query().range(0, 999);
    if (first.error) throw first.error;
    const data = first.data ?? [];
    let page = first.data ?? [];
    while (page.length === 1000) {
      const next = await query().range(data.length, data.length + 999);
      if (next.error) throw next.error;
      page = next.data ?? [];
      data.push(...page);
    }
    return { data };
  }
  // Only the latest notices are shipped; appointment events load on demand.
  async function recentNotices() {
    const { data, error } = await db
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(NOTICE_LIMIT);
    if (error) throw error;
    return { data: data ?? [] };
  }
  const [settings, notices, ...rows] = await Promise.all([
    loadSettings(),
    recentNotices(),
    ...tables.map(readAll),
  ]);
  return {
    settings,
    clients: rows[0].data ?? [],
    appointments: rows[1].data ?? [],
    fixedRules: rows[2].data ?? [],
    blocks: rows[3].data ?? [],
    notifications: notices.data,
    templates: {
      ...defaultTemplates,
      ...Object.fromEntries((rows[4].data ?? []).map((t) => [t.key, t.body])),
    },
    events: [],
  };
}
