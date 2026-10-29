"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import type { Store, Appointment, Client } from "@/lib/types";
import { createDemoStore } from "@/lib/demo";
import { availableSlots, overlaps } from "@/lib/availability";
import { dateKey } from "@/lib/dates";
import { formatInTimeZone } from "date-fns-tz";
const dateTimeClock = (value: string) =>
  formatInTimeZone(value, "America/Lima", "HH:mm");
import { normalizePhone } from "@/lib/whatsapp";
import { browserSupabase } from "@/lib/supabase/browser";
import {
  saveOfflineAgenda,
  clearOfflineAgenda,
  enableOfflineAgenda,
} from "@/lib/offline";
import { useRouter } from "next/navigation";
import {
  bookingSchema,
  blockSchema,
  ruleSchema,
  settingsSchema,
} from "@/lib/validation";
type Mutation = {
  kind: string;
  value?: Record<string, unknown>;
  remove?: boolean;
};
type Context = {
  store: Store;
  demo: boolean;
  online: boolean;
  busy: boolean;
  mutate: (m: Mutation) => Promise<unknown>;
  toast: (message: string) => void;
};
const StoreContext = createContext<Context | null>(null);
export const useStore = () => {
  const c = useContext(StoreContext);
  if (!c) throw new Error("Store missing");
  return c;
};
export function StoreProvider({
  children,
  initial,
  demo,
}: {
  children: React.ReactNode;
  initial: Store;
  demo: boolean;
}) {
  const [store, setStore] = useState(initial);
  const latestStore = useRef(store);
  const router = useRouter();
  useEffect(() => {
    if (demo) return;
    const {
      data: { subscription },
    } = browserSupabase().auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        void clearOfflineAgenda();
        router.replace("/login");
        router.refresh();
      } else if (
        session &&
        (event === "INITIAL_SESSION" || event === "SIGNED_IN")
      ) {
        enableOfflineAgenda();
        void saveOfflineAgenda(latestStore.current);
      }
    });
    return () => subscription.unsubscribe();
  }, [demo, router]);
  useEffect(() => {
    latestStore.current = store;
    if (!demo) void saveOfflineAgenda(store);
  }, [store, demo]);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const toast = useCallback((m: string) => setMessage(m), []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    if (demo) {
      try {
        const saved = localStorage.getItem("luisa-demo-v1");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.day === dateKey()) setStore(parsed.store);
        }
      } catch {
        /* Storage may be unavailable. */
      }
    }
  }, [demo]);
  useEffect(() => {
    if (demo) return;
    const db = browserSupabase();
    let active = true;
    const refresh = async () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      try {
        const r = await fetch("/api/admin", { cache: "no-store" });
        if (r.ok && active) setStore(await r.json());
      } catch {
        /* Keep the latest agenda visible. */
      }
    };
    const channel = db
      .channel("owner-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => {
          toast("Hay novedades en tu agenda.");
          void refresh();
        },
      )
      .subscribe();
    const timer = setInterval(refresh, 45000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      void db.removeChannel(channel);
    };
  }, [demo, toast]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  async function mutate(m: Mutation) {
    if (!online)
      throw new Error(
        "No hay conexión. Puedes consultar tu agenda y guardar cambios cuando vuelva internet.",
      );
    setBusy(true);
    try {
      if (!demo) {
        const r = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Luisa-App": "1" },
          body: JSON.stringify(m),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        const fresh = await fetch("/api/admin", { cache: "no-store" });
        if (!fresh.ok)
          throw new Error(
            "El cambio se guardó. Actualiza la página para ver la agenda.",
          );
        setStore(await fresh.json());
        return data.result;
      }
      const next = structuredClone(store);
      const v = m.value ?? {};
      const now = new Date().toISOString();
      const id = () => crypto.randomUUID();
      let result: unknown;
      if (m.kind === "booking") {
        const b = bookingSchema.parse(v);
        const slot = availableSlots({
          day: dateKey(b.start_at),
          settings: next.settings,
          rules: next.fixedRules,
          blocks: next.blocks,
          appointments: next.appointments,
          owner: true,
          overrideBlocks: b.override_blocks ?? false,
        }).find((s) => s.start_at === b.start_at);
        if (!slot)
          throw new Error("Ese horario ya no está disponible, elige otro.");
        let client = next.clients.find((c) => c.phone === b.phone);
        if (!client) {
          client = {
            id: id(),
            name: b.name,
            phone: b.phone,
            notes: "",
            source: "owner",
            archived_at: null,
            created_at: now,
          };
          next.clients.push(client);
        } else client.archived_at = null;
        const a: Appointment = {
          id: id(),
          client_id: client.id,
          start_at: slot.start_at,
          end_at: slot.end_at,
          status: "scheduled",
          source: "owner",
          service_note: b.service_note,
          action_token: `demo-${id()}`,
          reminder_sent_at: null,
          cancelled_by: null,
          needs_notice: false,
          created_at: now,
          updated_at: now,
        };
        next.appointments.push(a);
        next.events.push({
          id: id(),
          appointment_id: a.id,
          event: "created",
          actor: "owner",
          payload: {},
          created_at: now,
        });
        next.notifications.unshift({
          id: id(),
          type: "created",
          appointment_id: a.id,
          title: "Nueva cita reservada",
          read_at: null,
          created_at: now,
        });
        result = a;
      } else if (m.kind === "appointment") {
        const a = next.appointments.find((a) => a.id === v.id);
        if (!a) throw new Error("No encontramos esa cita.");
        if (v.action === "move") {
          const slot = availableSlots({
            day: dateKey(String(v.start_at)),
            settings: next.settings,
            durationMinutes:
              (+new Date(a.end_at) - +new Date(a.start_at)) / 60000,
            overrideBlocks: v.override_blocks === true,
            rules: next.fixedRules,
            blocks: next.blocks,
            appointments: next.appointments,
            owner: true,
            excludeId: a.id,
          }).find((s) => s.start_at === v.start_at);
          if (!slot)
            throw new Error("Ese horario ya no está disponible, elige otro.");
          a.start_at = slot.start_at;
          a.end_at = slot.end_at;
          a.status = "scheduled";
          a.reminder_sent_at = null;
          a.needs_notice = true;
        } else if (v.action === "confirm") a.status = "confirmed";
        else if (v.action === "cancel") {
          a.status = "cancelled";
          a.cancelled_by = "owner";
          a.needs_notice = true;
        } else if (v.action === "complete") a.status = "completed";
        else if (v.action === "no_show") a.status = "no_show";
        else if (v.action === "remind") a.reminder_sent_at = now;
        else if (v.action === "notice") a.needs_notice = false;
        if (v.service_note !== undefined)
          a.service_note = String(v.service_note);
        a.updated_at = now;
        next.events.push({
          id: id(),
          appointment_id: a.id,
          event: String(v.action),
          actor: "owner",
          payload: {},
          created_at: now,
        });
        result = a;
      } else if (m.kind === "client") {
        const phone = normalizePhone(String(v.phone));
        if (next.clients.some((c) => c.phone === phone && c.id !== v.id))
          throw new Error(
            "Ese teléfono ya pertenece a otro cliente. Busca su ficha.",
          );
        const existing = next.clients.find((c) => c.id === v.id);
        if (existing) Object.assign(existing, v, { phone });
        else
          next.clients.push({
            ...v,
            id: id(),
            phone,
            source: "owner",
            archived_at: null,
            created_at: now,
          } as Client);
      } else if (m.kind === "settings")
        next.settings = { ...next.settings, ...settingsSchema.parse(v) };
      else if (m.kind === "templates")
        next.templates = v as Record<string, string>;
      else if (m.kind === "read")
        next.notifications.forEach((n) => (n.read_at = now));
      else if (m.kind === "block") {
        if (m.remove) next.blocks = next.blocks.filter((b) => b.id !== v.id);
        else {
          const b = blockSchema.parse(v);
          if (
            next.appointments.some(
              (a) =>
                ["scheduled", "confirmed"].includes(a.status) &&
                overlaps(
                  new Date(a.start_at),
                  new Date(a.end_at),
                  new Date(b.start_at),
                  new Date(b.end_at),
                ),
            )
          )
            throw new Error(
              "Tienes citas en ese horario. Muévelas o cancélalas antes de bloquearlo.",
            );
          const existing = next.blocks.find((item) => item.id === b.id);
          if (existing) Object.assign(existing, b);
          else next.blocks.push({ ...b, id: b.id ?? id() });
        }
      } else if (m.kind === "rule") {
        if (m.remove)
          next.fixedRules = next.fixedRules.filter((r) => r.id !== v.id);
        else {
          const rule = ruleSchema.parse(v);
          const conflict = next.appointments.some(
            (a) =>
              ["scheduled", "confirmed"].includes(a.status) &&
              new Date(a.end_at) > new Date() &&
              new Date(a.start_at).toLocaleDateString("en-US", {
                timeZone: "America/Lima",
                weekday: "long",
              }) ===
                [
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ][rule.weekday] &&
              dateTimeClock(a.start_at) < rule.end_time &&
              dateTimeClock(a.end_at) > rule.start_time,
          );
          if (conflict)
            throw new Error(
              "Tienes citas en ese horario. Muévelas o cancélalas antes de bloquearlo.",
            );
          const existing = next.fixedRules.find((item) => item.id === rule.id);
          if (existing) Object.assign(existing, rule);
          else next.fixedRules.push({ ...rule, id: id() });
        }
      }
      localStorage.setItem(
        "luisa-demo-v1",
        JSON.stringify({ day: dateKey(), store: next }),
      );
      setStore(next);
      return result;
    } finally {
      setBusy(false);
    }
  }
  return (
    <StoreContext.Provider value={{ store, demo, online, busy, mutate, toast }}>
      {!online && (
        <div className="connection-banner" role="status">
          Sin conexión · Estás viendo la última agenda cargada.
        </div>
      )}
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
          <button aria-label="Cerrar aviso" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
    </StoreContext.Provider>
  );
}
export function resetDemo() {
  localStorage.removeItem("luisa-demo-v1");
  window.location.reload();
}
export { createDemoStore };
