"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Clock3,
  MapPin,
  Leaf,
  MessageCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
} from "lucide-react";
import { PublicShell } from "./public-shell";
import { Button } from "./ui/button";
import { Turnstile } from "./turnstile";
import { availableSlots } from "@/lib/availability";
import { dateKey, dayLabel, shiftDay, timeLabel } from "@/lib/dates";
import { createDemoStore, defaultSettings } from "@/lib/demo";
import { bookingSchema } from "@/lib/validation";
import { appointmentMessage, whatsappLink } from "@/lib/whatsapp";
import type { Store } from "@/lib/types";
import { SlotsSkeleton, Skeleton } from "./ui/skeleton";
type Result = { start_at: string; end_at: string; whatsapp: string };
export function BookingPage({ demo }: { demo: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const step = path.endsWith("/listo") ? 3 : path.endsWith("/datos") ? 2 : 1;
  const [day, setDay] = useState(dateKey());
  const [start, setStart] = useState("");
  const [page, setPage] = useState(0);
  const [slots, setSlots] = useState<{ start_at: string; end_at: string }[]>(
    [],
  );
  const [settings, setSettings] = useState(defaultSettings);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("luisa-booking") ?? "null",
      );
      if (saved) {
        setDay(saved.day);
        setStart(saved.start);
      }
      const details = JSON.parse(
        localStorage.getItem("luisa-my-details") ?? "null",
      );
      if (details) {
        setName(details.name);
        setPhone(details.phone);
      }
      const last = JSON.parse(
        sessionStorage.getItem("luisa-booking-result") ?? "null",
      );
      if (last) setResult(last);
      if (step === 2 && !saved) router.replace("/reservar");
      if (step === 3 && !last) router.replace("/reservar");
    } catch {
      if (step !== 1) router.replace("/reservar");
    }
  }, [router, step]);
  useEffect(() => {
    if (step !== 1) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    async function load() {
      try {
        if (demo) {
          let store = createDemoStore();
          try {
            const saved = JSON.parse(
              localStorage.getItem("luisa-demo-v1") ?? "null",
            );
            if (saved?.day === dateKey()) store = saved.store;
          } catch {}
          if (!cancelled) {
            setSettings(store.settings);
            setSlots(
              availableSlots({
                day,
                settings: store.settings,
                rules: store.fixedRules,
                blocks: store.blocks,
                appointments: store.appointments,
              }),
            );
          }
        } else {
          const r = await fetch(`/api/availability?day=${day}`, {
            cache: "no-store",
          });
          const body = await r.json();
          if (!r.ok) throw new Error(body.error);
          if (!cancelled) {
            setSlots(body.slots);
            setSettings((s) => ({ ...s, ...body.settings }));
          }
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [day, demo, step]);
  const days = Array.from(
    { length: Math.min(7, settings.booking_window_days - page * 7) },
    (_, i) => shiftDay(dateKey(), page * 7 + i),
  );
  function next() {
    if (!start) return;
    try {
      sessionStorage.setItem("luisa-booking", JSON.stringify({ day, start }));
      router.push("/reservar/datos");
    } catch {
      setError("Permite el almacenamiento de este navegador para continuar.");
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const b = bookingSchema.parse({
        name,
        phone,
        start_at: start,
        service_note: note,
        website: honeypot,
        turnstile: token,
      });
      let response: Result;
      if (demo) {
        let store: Store = createDemoStore();
        try {
          const saved = JSON.parse(
            localStorage.getItem("luisa-demo-v1") ?? "null",
          );
          if (saved?.day === dateKey()) store = saved.store;
        } catch {}
        const slot = availableSlots({
          day,
          settings: store.settings,
          rules: store.fixedRules,
          blocks: store.blocks,
          appointments: store.appointments,
        }).find((s) => s.start_at === start);
        if (!slot)
          throw new Error("Ese horario ya no está disponible, elige otro.");
        let c = store.clients.find((c) => c.phone === b.phone);
        const now = new Date().toISOString();
        if (!c) {
          c = {
            id: crypto.randomUUID(),
            name: b.name,
            phone: b.phone,
            notes: "",
            archived_at: null,
            created_at: now,
            source: "public",
          };
          store.clients.push(c);
        } else c.archived_at = null;
        const a = {
          id: crypto.randomUUID(),
          client_id: c.id,
          start_at: start,
          end_at: slot.end_at,
          status: "scheduled" as const,
          source: "public" as const,
          service_note: b.service_note,
          action_token: `demo-${crypto.randomUUID()}`,
          reminder_sent_at: null,
          cancelled_by: null,
          needs_notice: false,
          created_at: now,
          updated_at: now,
        };
        store.appointments.push(a);
        store.notifications.unshift({
          id: crypto.randomUUID(),
          type: "created",
          appointment_id: a.id,
          title: "Nueva cita reservada",
          read_at: null,
          created_at: now,
        });
        store.events.push({
          id: crypto.randomUUID(),
          appointment_id: a.id,
          event: "created",
          actor: "client",
          payload: {},
          created_at: now,
        });
        localStorage.setItem(
          "luisa-demo-v1",
          JSON.stringify({ day: dateKey(), store }),
        );
        response = {
          start_at: start,
          end_at: slot.end_at,
          whatsapp: whatsappLink(
            store.settings.owner_phone,
            appointmentMessage(
              store.templates.reserva_cliente,
              a,
              store.settings,
              location.origin,
              b.name,
            ),
          ),
        };
      } else {
        const r = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Luisa-App": "1" },
          body: JSON.stringify(b),
        });
        const body = await r.json();
        if (!r.ok) {
          if (r.status === 409) setToken("");
          throw new Error(body.error);
        }
        response = body;
      }
      localStorage.setItem(
        "luisa-my-details",
        JSON.stringify({ name: b.name, phone: b.phone }),
      );
      sessionStorage.setItem("luisa-booking-result", JSON.stringify(response));
      sessionStorage.removeItem("luisa-booking");
      setResult(response);
      router.push("/reservar/listo");
      if (!demo) window.location.assign(response.whatsapp);
    } catch (e) {
      const err = e as { issues?: { message: string }[]; message: string };
      setError(err.issues?.[0]?.message ?? err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <PublicShell demo={demo}>
      <div className="booking-layout">
        <aside className="booking-intro">
          <span className="eyebrow">
            <Leaf size={17} /> UN MOMENTO PARA TI
          </span>
          <h1>
            Baja el ritmo.
            <br />
            <em>Vuelve a ti.</em>
          </h1>
          <p>
            Regálate una pausa de bienestar,
            <br />
            en nuestro espacio de atención.
          </p>
          <div className="service-summary">
            <span className="service-icon">
              <Leaf size={30} strokeWidth={1.3} />
            </span>
            <h2>Tu sesión de masaje</h2>
            <p>Un espacio para soltar y recargar.</p>
            <div>
              <span>
                <Clock3 size={17} />
                {settings.slot_minutes} minutos
              </span>
              <span>
                <MapPin size={17} />
                Te recibimos en casa
              </span>
            </div>
          </div>
          <p className="booking-quote">
            “A veces, lo que más necesitas
            <br />
            es un momento de calma.”
          </p>
        </aside>
        <section className="booking-card">
          <div className="booking-steps">
            {["Tu momento", "Tus datos", "Todo listo"].map((label, i) => (
              <span key={label} className={step >= i + 1 ? "active" : ""}>
                <i>
                  {step > i + 1 ? (
                    <Check size={14} />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </i>
                {label}
              </span>
            ))}
          </div>
          {step === 1 ? (
            <>
              <div className="booking-card-title">
                <h2>¿Cuándo te viene bien?</h2>
                <p>Elige tu día y encuentra tu momento.</p>
              </div>
              <div className="booking-date-navigation">
                <h3>{dayLabel(`${day}T12:00:00-05:00`, "MMMM yyyy")}</h3>
                <div>
                  <button
                    className="icon-button"
                    disabled={page === 0}
                    aria-label="Días anteriores"
                    onClick={() => {
                      setPage(page - 1);
                      setDay(shiftDay(dateKey(), (page - 1) * 7));
                      setStart("");
                    }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    className="icon-button"
                    disabled={(page + 1) * 7 >= settings.booking_window_days}
                    aria-label="Días siguientes"
                    onClick={() => {
                      setPage(page + 1);
                      setDay(shiftDay(dateKey(), (page + 1) * 7));
                      setStart("");
                    }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
              <div className="booking-day-grid">
                {days.map((d) => (
                  <button
                    key={d}
                    className={d === day ? "selected" : ""}
                    onClick={() => {
                      setDay(d);
                      setStart("");
                    }}
                  >
                    <span>{dayLabel(`${d}T12:00:00-05:00`, "EEE")}</span>
                    <strong>{d.slice(-2)}</strong>
                    <i />
                  </button>
                ))}
              </div>
              <div className="booking-time-heading">
                <Clock3 size={17} />
                <span>Horarios disponibles</span>
                <small>Hora de Perú</small>
              </div>
              {loading ? (
                <SlotsSkeleton />
              ) : (
                <div
                  key={day}
                  className="time-grid booking-time-grid interaction-reveal"
                >
                  {slots.map((s) => (
                    <button
                      className={`time-slot ${start === s.start_at ? "selected" : ""}`}
                      key={s.start_at}
                      onClick={() => setStart(s.start_at)}
                    >
                      {timeLabel(s.start_at)}
                    </button>
                  ))}
                </div>
              )}
              {!loading && !slots.length && !error && (
                <div className="empty-state">
                  <Leaf size={30} />
                  <p>
                    Este día no tiene horarios libres.
                    <br />
                    Elige otra fecha para tu pausa.
                  </p>
                </div>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <Button
                className="full-width"
                disabled={!start || loading}
                onClick={next}
              >
                Continuar
                <ArrowRight size={19} />
              </Button>
              <p className="booking-note">
                <LockKeyhole size={14} /> Sin crear una cuenta. Sin
                complicaciones.
              </p>
            </>
          ) : step === 2 ? (
            <>
              <button
                className="back-link"
                onClick={() => router.push("/reservar")}
              >
                <ArrowLeft size={17} />
                Cambiar día u hora
              </button>
              <div className="booking-card-title">
                <h2>Nos falta conocerte</h2>
                <p>Solo unos datos para preparar tu cita.</p>
              </div>
              {start && (
                <div className="booking-selection">
                  <CalendarDays size={21} />
                  <span>
                    {dayLabel(start, "EEEE d 'de' MMMM")}
                    <strong>{timeLabel(start)}</strong>
                  </span>
                  <Check size={19} />
                </div>
              )}
              <form className="stack-form" onSubmit={submit}>
                <label>
                  ¿Cómo te llamas?
                  <input
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                  />
                </label>
                <label>
                  Tu celular de WhatsApp
                  <div className="phone-input">
                    <span>🇵🇪 +51</span>
                    <input
                      inputMode="tel"
                      autoComplete="tel-national"
                      required
                      value={
                        phone.startsWith("51") && phone.length === 11
                          ? phone.slice(2)
                          : phone
                      }
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="987 654 321"
                    />
                  </div>
                </label>
                <label>
                  ¿Algo que quieras contarnos? <small>(opcional)</small>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Por ejemplo: la cita es para mi mamá. No incluyas información de salud."
                  />
                </label>
                <label className="honeypot" aria-hidden="true">
                  Sitio web
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </label>
                <p className="privacy-note">
                  Usaremos tu nombre y celular solo para gestionar tu cita. Tus
                  datos y notas son privados.
                </p>
                {!demo && <Turnstile key={error} onToken={setToken} />}{" "}
                {error && (
                  <div className="form-error" role="alert">
                    {error}
                    {error.includes("horario") && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => router.push("/reservar")}
                      >
                        {" "}
                        Elegir otro horario
                      </button>
                    )}
                  </div>
                )}
                <Button
                  type="submit"
                  loading={busy}
                  disabled={busy || (!demo && !token)}
                >
                  <MessageCircle size={20} />
                  {busy
                    ? "Guardando tu momento…"
                    : demo
                      ? "Guardar reserva de prueba"
                      : "Guardar y enviar por WhatsApp"}
                </Button>
              </form>
            </>
          ) : result ? (
            <div className="success-panel public-success">
              <span className="success-icon">
                <Check size={34} />
              </span>
              <span className="eyebrow">TU PAUSA YA TIENE FECHA</span>
              <h2>
                Un momento de calma
                <br />
                te está esperando.
              </h2>
              <p>
                {demo
                  ? "Tu reserva de prueba quedó guardada en este navegador."
                  : "Tu cita quedó agendada. Solo falta enviar el mensaje de WhatsApp para coordinar los detalles."}
              </p>
              <div className="booking-selection">
                <CalendarDays size={23} />
                <span>
                  {dayLabel(result.start_at)}
                  <strong>
                    {timeLabel(result.start_at)} – {timeLabel(result.end_at)}
                  </strong>
                </span>
              </div>
              <Button asChild>
                <a href={result.whatsapp} target="_blank" rel="noreferrer">
                  <MessageCircle size={19} />
                  Abrir WhatsApp
                </a>
              </Button>
              <p className="field-help">
                Toca enviar cuando se abra el mensaje.
              </p>
              <Link href="/reservar" className="subtle-link">
                Reservar otro momento <ArrowRight size={17} />
              </Link>
            </div>
          ) : (
            <div role="status" aria-label="Preparando tu reserva">
              <Skeleton className="sk-panel" />
              <Skeleton className="sk-action" />
            </div>
          )}
        </section>
      </div>
    </PublicShell>
  );
}
