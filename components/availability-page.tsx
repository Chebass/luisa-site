"use client";
import { ModalPresence } from "./modal-presence";
import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Clock3,
  CalendarOff,
  Trash2,
  Leaf,
  ArrowUpRight,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { useStore } from "./store-provider";
import { Button } from "./ui/button";
import { Modal } from "./modal";
import { dateKey, dayLabel, localInstant, timeLabel } from "@/lib/dates";
import { formatInTimeZone } from "date-fns-tz";
import { DatePicker } from "./ui/date-picker";
import { TimePicker } from "./ui/time-picker";
import { Select } from "./ui/select";
const weekdays = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
export function AvailabilityPage({
  initialBlockId,
  initialRuleId,
}: {
  initialBlockId?: string;
  initialRuleId?: string;
}) {
  const { store, mutate, busy, toast } = useStore();
  const [kind, setKind] = useState<"rule" | "block" | null>(null);
  const [day, setDay] = useState(dateKey());
  const [endDay, setEndDay] = useState(dateKey());
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("18:00");
  const [weekday, setWeekday] = useState(1);
  const [label, setLabel] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<string | undefined>();
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    const block = store.blocks.find((b) => b.id === initialBlockId);
    const rule = store.fixedRules.find((r) => r.id === initialRuleId);
    if (block) {
      opened.current = true;
      setEditId(block.id);
      setKind("block");
      setDay(dateKey(block.start_at));
      setEndDay(dateKey(block.end_at));
      setStart(formatInTimeZone(block.start_at, "America/Lima", "HH:mm"));
      setEnd(formatInTimeZone(block.end_at, "America/Lima", "HH:mm"));
      setLabel(block.reason);
      setAllDay(false);
    } else if (rule) {
      opened.current = true;
      setEditId(rule.id);
      setKind("rule");
      setWeekday(rule.weekday);
      setStart(rule.start_time.slice(0, 5));
      setEnd(rule.end_time.slice(0, 5));
      setLabel(rule.label);
      setAllDay(false);
    }
  }, [store.blocks, store.fixedRules, initialBlockId, initialRuleId]);
  const [remove, setRemove] = useState<{ kind: string; id: string } | null>(
    null,
  );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await mutate({
        kind: kind!,
        value:
          kind === "rule"
            ? {
                id: editId,
                weekday,
                start_time: allDay ? "00:00" : start,
                end_time: allDay ? "23:59" : end,
                label,
                active: true,
              }
            : {
                id: editId,
                start_at: localInstant(
                  day,
                  allDay ? "00:00" : start,
                ).toISOString(),
                end_at: localInstant(
                  endDay,
                  allDay ? "23:59" : end,
                ).toISOString(),
                reason: label,
              },
      });
      setKind(null);
      setLabel("");
      toast("Tu tiempo quedó reservado.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const upcoming = store.blocks
    .filter((b) => new Date(b.end_at) >= new Date())
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">TU TIEMPO TAMBIÉN IMPORTA</div>
          <h1>Haz espacio para ti</h1>
          <p>
            Marca cuándo no atiendes. El resto estará disponible para reservar.
          </p>
        </div>
        <Button
          onClick={() => {
            setKind("block");
            setEditId(undefined);
            setError("");
            setLabel("");
          }}
        >
          <Plus size={20} />
          Bloquear un horario
        </Button>
      </div>
      <div className="availability-intro">
        <Leaf size={28} />
        <p>
          No necesitas llenar tu agenda de horarios libres.
          <br />
          <strong>Solo dinos cuándo quieres hacer una pausa.</strong>
        </p>
      </div>
      <div className="availability-columns">
        <section className="content-card">
          <div className="section-heading">
            <div>
              <span className="section-icon gray">
                <Clock3 size={23} />
              </span>
              <h2>Horarios fijos</h2>
              <p>Momentos en los que no atiendes cada semana.</p>
            </div>
          </div>
          <div className="unavailability-list">
            {store.fixedRules.map((r) => (
              <div className="unavailability-item rule-item" key={r.id}>
                <span>
                  <strong>{weekdays[r.weekday]}</strong>
                  <small>
                    {r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)} ·{" "}
                    {r.label}
                  </small>
                </span>
                <button
                  className="icon-button"
                  onClick={() => setRemove({ kind: "rule", id: r.id })}
                  aria-label={`Quitar ${r.label}`}
                >
                  <Trash2 size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Editar ${r.label}`}
                  onClick={() => {
                    setEditId(r.id);
                    setKind("rule");
                    setWeekday(r.weekday);
                    setStart(r.start_time.slice(0, 5));
                    setEnd(r.end_time.slice(0, 5));
                    setLabel(r.label);
                    setAllDay(
                      r.start_time.startsWith("00:00") &&
                        r.end_time.startsWith("23:59"),
                    );
                    setError("");
                  }}
                >
                  <Pencil size={18} />
                </button>
              </div>
            ))}
            {!store.fixedRules.length && (
              <p className="empty-inline">
                Aún no tienes horarios fijos bloqueados.
              </p>
            )}
          </div>
          <Button
            variant="outline"
            className="full-width"
            onClick={() => {
              setKind("rule");
              setEditId(undefined);
              setError("");
              setLabel("");
            }}
          >
            <Plus size={18} />
            Agregar horario fijo
          </Button>
        </section>
        <section className="content-card">
          <div className="section-heading">
            <div>
              <span className="section-icon amber">
                <CalendarOff size={23} />
              </span>
              <h2>Bloqueos de estas semanas</h2>
              <p>Un compromiso, una tarde libre o un descanso.</p>
            </div>
          </div>
          <div className="unavailability-list">
            {upcoming.map((b) => (
              <div className="unavailability-item block-item" key={b.id}>
                <span>
                  <strong>{b.reason}</strong>
                  <small>
                    {dayLabel(b.start_at, "EEE d MMM")} ·{" "}
                    {timeLabel(b.start_at)} –{" "}
                    {dateKey(b.start_at) !== dateKey(b.end_at)
                      ? dayLabel(b.end_at, "EEE d MMM") + " "
                      : ""}
                    {timeLabel(b.end_at)}
                  </small>
                </span>
                <button
                  className="icon-button"
                  aria-label={`Quitar ${b.reason}`}
                  onClick={() => setRemove({ kind: "block", id: b.id })}
                >
                  <Trash2 size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Editar ${b.reason}`}
                  onClick={() => {
                    setEditId(b.id);
                    setKind("block");
                    setDay(dateKey(b.start_at));
                    setEndDay(dateKey(b.end_at));
                    setStart(
                      formatInTimeZone(b.start_at, "America/Lima", "HH:mm"),
                    );
                    setEnd(formatInTimeZone(b.end_at, "America/Lima", "HH:mm"));
                    setLabel(b.reason);
                    setAllDay(false);
                    setError("");
                  }}
                >
                  <Pencil size={18} />
                </button>
              </div>
            ))}
            {!upcoming.length && (
              <p className="empty-inline">
                Sin bloqueos próximos. ¿Quieres reservar un momento para ti?
              </p>
            )}
          </div>
          <Button
            variant="outline"
            className="full-width"
            onClick={() => {
              setKind("block");
              setEditId(undefined);
              setError("");
              setLabel("");
            }}
          >
            <Plus size={18} />
            Agregar bloqueo
          </Button>
        </section>
      </div>
      <p className="help-box">
        Si hay una cita en un horario que quieres bloquear, primero podrás
        moverla o cancelarla desde el calendario.{" "}
        <Link href="/calendario">
          Ir al calendario <ArrowUpRight size={16} />
        </Link>
      </p>
      <ModalPresence>
        {kind && (
          <Modal
            title={
              kind === "rule"
                ? "Un horario que se repite"
                : "Reservar un momento para ti"
            }
            onClose={() => setKind(null)}
          >
            <form onSubmit={submit} className="stack-form">
              {kind === "rule" ? (
                <label>
                  Día de la semana
                  <Select
                    label="Día de la semana"
                    value={String(weekday)}
                    onValueChange={(value) => setWeekday(Number(value))}
                    options={weekdays.map((label, i) => ({
                      label,
                      value: String(i),
                    }))}
                  />
                </label>
              ) : (
                <div className="form-row">
                  <label>
                    Desde el día
                    <DatePicker
                      label="Desde el día"
                      value={day}
                      min={dateKey()}
                      onChange={(value) => {
                        setDay(value);
                        if (endDay < value) setEndDay(value);
                      }}
                      required
                    />
                  </label>
                  <label>
                    Hasta el día
                    <DatePicker
                      label="Hasta el día"
                      value={endDay}
                      min={day}
                      onChange={setEndDay}
                      required
                    />
                  </label>
                </div>
              )}
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                />
                Bloquear todo el día
              </label>
              {!allDay && (
                <div className="form-row">
                  <TimePicker
                    label="Desde las"
                    value={start}
                    onChange={setStart}
                  />
                  <TimePicker label="Hasta las" value={end} onChange={setEnd} />
                </div>
              )}
              <label>
                ¿Cómo lo llamamos?
                <input
                  required
                  maxLength={120}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Por ejemplo: trabajo, familia o descanso"
                />
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <Button loading={busy} disabled={busy}>
                {busy ? "Guardando…" : "Guardar mi pausa"}
              </Button>
            </form>
          </Modal>
        )}
      </ModalPresence>
      <ModalPresence>
        {remove && (
          <Modal title="¿Liberar este horario?" onClose={() => setRemove(null)}>
            <p>
              Los clientes podrán reservar en este espacio si no hay otra cita o
              bloqueo.
            </p>
            <div className="dialog-actions">
              <Button
                disabled={busy}
                onClick={async () => {
                  try {
                    await mutate({
                      kind: remove.kind,
                      value: { id: remove.id },
                      remove: true,
                    });
                    setRemove(null);
                    toast("Horario liberado.");
                  } catch (e) {
                    toast((e as Error).message);
                  }
                }}
              >
                Sí, liberar horario
              </Button>
              <Button variant="outline" onClick={() => setRemove(null)}>
                Mantener bloqueo
              </Button>
            </div>
          </Modal>
        )}
      </ModalPresence>
    </>
  );
}
