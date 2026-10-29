"use client";
import { useState } from "react";
import {
  Check,
  Search,
  CalendarDays,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { useStore } from "./store-provider";
import { Button } from "./ui/button";
import { Modal } from "./modal";
import { availableSlots } from "@/lib/availability";
import { dateKey, timeLabel, shiftDay } from "@/lib/dates";
import {
  appointmentMessage,
  whatsappLink,
  normalizePhone,
} from "@/lib/whatsapp";
import type { Appointment } from "@/lib/types";
import { DatePicker } from "./ui/date-picker";
export function AppointmentForm({
  onClose,
  clientId,
  initialDay,
  appointment,
}: {
  onClose: () => void;
  clientId?: string;
  initialDay?: string;
  appointment?: Appointment;
}) {
  const { store, mutate, busy, toast, demo } = useStore();
  const existing = store.clients.find(
    (c) => c.id === (appointment?.client_id ?? clientId),
  );
  const [name, setName] = useState(existing?.name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [query, setQuery] = useState("");
  const [day, setDay] = useState(
    initialDay ?? (appointment ? dateKey(appointment.start_at) : dateKey()),
  );
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState(appointment?.service_note ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Appointment | null>(null);
  const [showBlocked, setShowBlocked] = useState(false);
  const [confirmOverride, setConfirmOverride] = useState(false);
  const slots = availableSlots({
    day,
    settings: store.settings,
    durationMinutes: appointment
      ? (+new Date(appointment.end_at) - +new Date(appointment.start_at)) /
        60000
      : undefined,
    overrideBlocks: showBlocked,
    rules: store.fixedRules,
    blocks: store.blocks,
    appointments: store.appointments,
    owner: true,
    excludeId: appointment?.id,
  });
  const regularSlots = showBlocked
    ? availableSlots({
        day,
        settings: store.settings,
        durationMinutes: appointment
          ? (+new Date(appointment.end_at) - +new Date(appointment.start_at)) /
            60000
          : undefined,
        rules: store.fixedRules,
        blocks: store.blocks,
        appointments: store.appointments,
        owner: true,
        excludeId: appointment?.id,
      })
    : slots;
  const isBlocked =
    Boolean(selected) && !regularSlots.some((s) => s.start_at === selected);
  async function submit(e?: React.FormEvent, confirmed = false) {
    e?.preventDefault();
    setError("");
    try {
      if (!selected) throw new Error("Elige un horario disponible.");
      if (isBlocked && !confirmed) {
        setConfirmOverride(true);
        return;
      }
      const result = (await mutate(
        appointment
          ? {
              kind: "appointment",
              value: {
                id: appointment.id,
                action: "move",
                start_at: selected,
                service_note: note,
                override_blocks: isBlocked && confirmed,
              },
            }
          : {
              kind: "booking",
              value: {
                name,
                phone,
                start_at: selected,
                service_note: note,
                override_blocks: isBlocked && confirmed,
              },
            },
      )) as Appointment;
      const known = store.clients.find(
        (c) => c.phone === normalizePhone(phone),
      );
      if (known && known.name !== name) {
        setName(known.name);
        toast(
          `Este celular ya pertenece a ${known.name}. Conservamos su ficha y su nombre.`,
        );
      }
      setSaved({
        ...result,
        client_id: existing?.id ?? "",
        action_token: result.action_token,
        start_at: selected,
        end_at: result.end_at,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function notify() {
    if (demo) {
      toast("En la demostración no se envían mensajes a clientes ficticios.");
      onClose();
      return;
    }
    try {
      const url = whatsappLink(
        phone,
        appointmentMessage(
          store.templates[appointment ? "modificada_dueña" : "agendada_dueña"],
          saved!,
          store.settings,
          window.location.origin,
          name,
          appointment?.start_at,
        ),
      );
      window.open(url, "_blank", "noopener,noreferrer");
      if (appointment)
        void mutate({
          kind: "appointment",
          value: { id: appointment.id, action: "notice" },
        }).catch((e) => toast(e.message));
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Modal
      title={
        saved
          ? "Todo listo"
          : appointment
            ? "Cambiar de horario"
            : "Un nuevo momento de bienestar"
      }
      onClose={onClose}
    >
      {confirmOverride && !saved ? (
        <div className="stack-form">
          <h3>Este horario está bloqueado</h3>
          <p>
            Estás reservando un espacio que marcaste como no disponible.
            ¿Quieres agendar esta cita de todos modos?
          </p>
          <Button disabled={busy} onClick={() => void submit(undefined, true)}>
            Sí, agendar sobre el bloqueo
          </Button>
          <Button variant="outline" onClick={() => setConfirmOverride(false)}>
            Elegir otro horario
          </Button>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
      ) : saved ? (
        <div className="success-panel">
          <span className="success-icon">
            <Check size={32} />
          </span>
          <h3>
            {appointment
              ? "La cita cambió de horario"
              : "La cita quedó agendada"}
          </h3>
          <p>Ahora puedes avisar a {name.split(" ")[0]} por WhatsApp.</p>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button onClick={notify}>
            <MessageCircle size={19} />
            Avisar por WhatsApp
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Lo haré después
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="stack-form">
          {!appointment && (
            <>
              <label>
                Buscar un cliente
                <span className="search-field">
                  <Search size={19} />
                  <input
                    value={query}
                    placeholder="Nombre o teléfono"
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </span>
              </label>
              {query && (
                <div className="search-results">
                  {store.clients
                    .filter(
                      (c) =>
                        !c.archived_at &&
                        `${c.name} ${c.phone}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                    )
                    .map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => {
                          setName(c.name);
                          setPhone(c.phone);
                          setQuery("");
                        }}
                      >
                        {c.name}
                        <small>{c.phone}</small>
                      </button>
                    ))}
                </div>
              )}
              <div className="form-row">
                <label>
                  Nombre
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre del cliente"
                    autoComplete="name"
                  />
                </label>
                <label>
                  Celular
                  <input
                    required
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="987 654 321"
                    autoComplete="tel"
                  />
                </label>
              </div>
              <p className="field-help">
                Si el teléfono ya está registrado, conservaremos el nombre de su
                ficha.
              </p>
            </>
          )}
          <label>
            <span>
              <CalendarDays size={18} /> Día de la cita
            </span>
            <DatePicker
              label="Día de la cita"
              required
              value={day}
              min={dateKey()}
              max={shiftDay(dateKey(), 90)}
              onChange={(value) => {
                setDay(value);
                setSelected("");
              }}
            />
          </label>
          <fieldset>
            <legend>Horarios disponibles</legend>
            <div className="time-grid">
              {slots.map((s) => (
                <button
                  key={s.start_at}
                  type="button"
                  className={`time-slot ${selected === s.start_at ? "selected" : ""}`}
                  onClick={() => setSelected(s.start_at)}
                >
                  {timeLabel(s.start_at)}
                </button>
              ))}
            </div>
            {slots.length === 0 && (
              <p className="empty-inline">
                No hay horarios libres este día. Prueba otra fecha.
              </p>
            )}
          </fieldset>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showBlocked}
              onChange={(e) => {
                setShowBlocked(e.target.checked);
                setSelected("");
              }}
            />
            También ver mis horarios bloqueados
          </label>
          <label>
            Nota de la cita <small>(opcional)</small>
            <textarea
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Por ejemplo: la sesión es para su mamá"
              rows={2}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" loading={busy} disabled={busy || !selected}>
            {busy ? "Guardando…" : "Guardar cita"}
            <ArrowRight size={18} />
          </Button>
        </form>
      )}
    </Modal>
  );
}
