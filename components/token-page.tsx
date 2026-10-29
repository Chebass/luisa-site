"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CalendarDays,
  MessageCircle,
  Leaf,
} from "lucide-react";
import { PublicShell } from "./public-shell";
import { Button } from "./ui/button";
import { dateKey, dayLabel, timeLabel } from "@/lib/dates";
import { DatePicker } from "./ui/date-picker";
import { SlotsSkeleton } from "./ui/skeleton";
type Summary = {
  start_at: string;
  end_at: string;
  status: string;
  whatsapp?: string;
  already?: boolean;
};
export function TokenPage({
  token,
  action,
  demo,
}: {
  token: string;
  action?: string;
  demo: boolean;
}) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [day, setDay] = useState(dateKey());
  const [slots, setSlots] = useState<{ start_at: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(action === "modificar");
  const started = useRef(false);
  const perform = useCallback(
    async (which: string, start?: string) => {
      setBusy(true);
      setError("");
      try {
        const r = await fetch(`/api/c/${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Luisa-App": "1" },
          body: JSON.stringify({ action: which, start_at: start }),
        });
        const body = await r.json();
        if (!r.ok) throw new Error(body.error);
        setSummary(body);
        setDone(true);
        if (body.whatsapp) window.location.replace(body.whatsapp);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [token],
  );
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (demo) {
      setError(
        "Los enlaces de gestión se activan al conectar la base de datos. Esta es una demostración local.",
      );
      return;
    }
    if (action === "confirmar") {
      void perform("confirm");
      return;
    }
    async function load() {
      try {
        const r = await fetch(`/api/c/${token}`, { cache: "no-store" });
        const body = await r.json();
        if (!r.ok) throw new Error(body.error);
        setSummary(body);
        if (body.status === "cancelled") setDone(true);
      } catch (e) {
        setError((e as Error).message);
      }
    }
    void load();
  }, [action, demo, perform, token]);
  useEffect(() => {
    if (action !== "modificar" || demo) return;
    let active = true;
    setSlotsLoading(true);
    setSelected("");
    async function load() {
      try {
        const r = await fetch(`/api/availability?day=${day}&token=${token}`, {
          cache: "no-store",
        });
        const b = await r.json();
        if (!r.ok) throw new Error(b.error);
        if (active) setSlots(b.slots);
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setSlotsLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [action, day, demo, token]);
  return (
    <PublicShell demo={demo}>
      <section className="action-card">
        <span className="section-icon">
          <Leaf size={27} />
        </span>
        {done ? (
          <>
            <span className="success-icon">
              <Check size={32} />
            </span>
            <h1>
              {summary?.already
                ? "Tu cita ya estaba " +
                  (summary.status === "cancelled" ? "cancelada" : "confirmada")
                : summary?.status === "cancelled"
                  ? "Tu cita fue cancelada"
                  : action === "modificar"
                    ? "Tu cita cambió de horario"
                    : "Tu cita quedó confirmada"}
            </h1>
            <p>
              {summary?.status === "cancelled"
                ? "El horario quedó libre. Siempre puedes reservar otro momento."
                : "Te esperamos para un momento de bienestar."}
            </p>
          </>
        ) : (
          <>
            <span className="eyebrow">TU MOMENTO DE BIENESTAR</span>
            <h1>
              {action === "confirmar"
                ? "Confirmando tu cita…"
                : action === "cancelar"
                  ? "¿Quieres cancelar tu cita?"
                  : action === "modificar"
                    ? "Encuentra un nuevo momento"
                    : "Tu próxima pausa"}
            </h1>
          </>
        )}
        {summary && (
          <div className="booking-selection">
            <CalendarDays size={23} />
            <span>
              {dayLabel(summary.start_at)}
              <strong>
                {timeLabel(summary.start_at)} – {timeLabel(summary.end_at)}
              </strong>
            </span>
          </div>
        )}
        {busy && action === "confirmar" && (
          <Button loading disabled>
            Confirmando tu cita…
          </Button>
        )}
        {!summary && !busy && !error && <SlotsSkeleton />}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="stack-form">
          {!done && summary && action === "cancelar" && (
            <>
              <p>
                Si cancelas, el horario se libera. Para otra fecha tendrás que
                reservar de nuevo o cambiar el horario.
              </p>
              <Button
                loading={busy}
                variant="destructive"
                onClick={() => perform("cancel")}
              >
                Sí, cancelar mi cita
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/c/${token}`}>No, mantener mi cita</Link>
              </Button>
              <Link className="subtle-link" href={`/c/${token}/modificar`}>
                Mejor cambiar de horario
                <ArrowRight size={18} />
              </Link>
            </>
          )}
          {!done && summary && action === "modificar" && (
            <>
              <label>
                Elige un nuevo día
                <DatePicker
                  label="Elige un nuevo día"
                  value={day}
                  min={dateKey()}
                  onChange={(value) => {
                    setDay(value);
                    setError("");
                  }}
                />
              </label>
              {slotsLoading ? (
                <SlotsSkeleton />
              ) : (
                <div key={day} className="time-grid interaction-reveal">
                  {slots.map((s) => (
                    <button
                      key={s.start_at}
                      className={`time-slot ${selected === s.start_at ? "selected" : ""}`}
                      onClick={() => setSelected(s.start_at)}
                    >
                      {timeLabel(s.start_at)}
                    </button>
                  ))}
                </div>
              )}
              {!slotsLoading && !slots.length && (
                <p>No hay horarios libres este día. Prueba otra fecha.</p>
              )}
              <Button
                loading={busy}
                disabled={!selected}
                onClick={() => perform("move", selected)}
              >
                Guardar nuevo horario
                <ArrowRight size={18} />
              </Button>
            </>
          )}
          {!busy && !done && summary && !action && (
            <>
              <Button asChild>
                <Link href={`/c/${token}/confirmar`}>
                  Confirmar mi cita
                  <Check size={18} />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/c/${token}/modificar`}>Cambiar de horario</Link>
              </Button>
              <Link className="danger-text" href={`/c/${token}/cancelar`}>
                Cancelar mi cita
              </Link>
            </>
          )}
          {!busy && !done && action === "confirmar" && error && !demo && (
            <Button onClick={() => perform("confirm")}>
              Confirmar mi cita
            </Button>
          )}
          {done && summary?.whatsapp && (
            <Button asChild>
              <a href={summary.whatsapp}>
                <MessageCircle size={19} />
                Abrir WhatsApp
              </a>
            </Button>
          )}
          {(done || error) && (
            <Button variant="outline" asChild>
              <Link href="/reservar">
                Reservar otra cita
                <ArrowRight size={18} />
              </Link>
            </Button>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
