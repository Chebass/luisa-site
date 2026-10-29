"use client";
import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Phone,
  MessageCircle,
  Check,
  ArrowRight,
  Clock3,
} from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./ui/button";
import { AppointmentForm } from "./appointment-form";
import { useStore } from "./store-provider";
import { dayLabel, timeLabel } from "@/lib/dates";
import { statusLabels } from "@/lib/types";
import { appointmentMessage, whatsappLink } from "@/lib/whatsapp";
const eventLabels: Record<string, string> = {
  created: "Cita agendada",
  confirm: "Cita confirmada",
  cancel: "Cita cancelada",
  move: "Cambio de horario",
  complete: "Sesión atendida",
  no_show: "No asistió",
  remind: "Se abrió el recordatorio",
  notice: "Se abrió el aviso",
  note: "Nota actualizada",
};
export function AppointmentDetail({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { store, mutate, busy, toast, demo } = useStore();
  const [editing, setEditing] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [notify, setNotify] = useState(false);
  const [error, setError] = useState("");
  const [editNote, setEditNote] = useState(false);
  const [note, setNote] = useState("");
  const a = store.appointments.find((a) => a.id === id);
  const c = store.clients.find((c) => c.id === a?.client_id);
  if (!a || !c) return null;
  async function act(action: string) {
    try {
      await mutate({ kind: "appointment", value: { id, action } });
      if (action === "cancel") {
        setNotify(true);
        setCancel(false);
      } else
        toast(action === "confirm" ? "Cita confirmada." : "Cita actualizada.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (editing) return <AppointmentForm appointment={a} onClose={onClose} />;
  return (
    <Modal
      title={
        cancel
          ? "¿Cancelar esta cita?"
          : notify
            ? "La cita fue cancelada"
            : "Detalle de la cita"
      }
      onClose={onClose}
    >
      <div className="detail-client">
        <span className="avatar avatar-large">{c.name[0]}</span>
        <div>
          <Link
            href={`/clientes?cliente=${c.id}`}
            onClick={onClose}
            className="client-name"
          >
            {c.name}
            <ArrowRight size={18} />
          </Link>
          <span className={`status status-${a.status}`}>
            {statusLabels[a.status]}
          </span>
        </div>
      </div>
      <div className="detail-datetime">
        <p>
          <CalendarDays size={21} />
          {dayLabel(a.start_at)}
        </p>
        <p>
          <Clock3 size={21} />
          {timeLabel(a.start_at)} – {timeLabel(a.end_at)}
        </p>
      </div>
      {a.service_note && <div className="note-box">{a.service_note}</div>}
      {!cancel &&
        !notify &&
        (editNote ? (
          <div className="stack-form">
            <label>
              Nota de la cita
              <textarea
                maxLength={500}
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <Button
              disabled={busy}
              onClick={async () => {
                try {
                  await mutate({
                    kind: "appointment",
                    value: { id, action: "note", service_note: note },
                  });
                  setEditNote(false);
                  toast("Nota guardada.");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Guardar nota
            </Button>
            <Button variant="ghost" onClick={() => setEditNote(false)}>
              Volver
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={() => {
              setNote(a.service_note);
              setEditNote(true);
            }}
          >
            {a.service_note ? "Editar nota" : "Agregar nota a la cita"}
          </Button>
        ))}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {cancel ? (
        <div className="stack-form">
          <p>
            El horario quedará libre. Después podrás avisarle a{" "}
            {c.name.split(" ")[0]}.
          </p>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => act("cancel")}
          >
            Sí, cancelar la cita
          </Button>
          <Button variant="outline" onClick={() => setCancel(false)}>
            Mantener la cita
          </Button>
        </div>
      ) : notify ? (
        <div className="stack-form">
          <p>Avísale del cambio para que pueda organizarse.</p>
          <Button
            onClick={() => {
              if (demo) {
                toast("No se envían mensajes a clientes ficticios.");
                onClose();
                return;
              }
              window.open(
                whatsappLink(
                  c.phone,
                  appointmentMessage(
                    store.templates.cancelada_dueña,
                    a,
                    store.settings,
                    window.location.origin,
                    c.name,
                  ),
                ),
                "_blank",
                "noopener,noreferrer",
              );
              void act("notice");
              onClose();
            }}
          >
            <MessageCircle size={19} />
            Avisar por WhatsApp
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Lo haré después
          </Button>
        </div>
      ) : (
        <>
          <div className="detail-contact">
            {demo ? (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    toast(
                      "Los teléfonos de clientes son ficticios en la demostración.",
                    )
                  }
                >
                  <Phone size={18} />
                  Llamar
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    toast(
                      "Los teléfonos de clientes son ficticios en la demostración.",
                    )
                  }
                >
                  <MessageCircle size={18} />
                  WhatsApp
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline">
                  <a href={`tel:+${c.phone}`}>
                    <Phone size={18} />
                    Llamar
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a
                    href={whatsappLink(
                      c.phone,
                      `Hola ${c.name}, soy ${store.settings.owner_name}.`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle size={18} />
                    WhatsApp
                  </a>
                </Button>
              </>
            )}
          </div>
          {["scheduled", "confirmed"].includes(a.status) && (
            <div className="detail-options">
              {a.status === "scheduled" && (
                <Button disabled={busy} onClick={() => act("confirm")}>
                  <Check size={18} />
                  Confirmar cita
                </Button>
              )}
              <Button variant="outline" onClick={() => setEditing(true)}>
                Cambiar de horario
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => act("complete")}
              >
                Marcar como atendida
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => act("no_show")}
              >
                No asistió
              </Button>
              <Button
                variant="ghost"
                className="danger-text"
                onClick={() => setCancel(true)}
              >
                Cancelar cita
              </Button>
            </div>
          )}
          <div className="event-list">
            <h3>Historia de esta cita</h3>
            {store.events
              .filter((e) => e.appointment_id === id)
              .sort((x, y) => y.created_at.localeCompare(x.created_at))
              .map((e) => (
                <p key={e.id}>
                  <span>{eventLabels[e.event] ?? e.event}</span>
                  <small>
                    {dayLabel(e.created_at, "d MMM")} ·{" "}
                    {timeLabel(e.created_at)}
                  </small>
                </p>
              ))}
          </div>
        </>
      )}
    </Modal>
  );
}
