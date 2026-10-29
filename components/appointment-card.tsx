"use client";
import {
  ArrowUpRight,
  Check,
  MessageCircle,
  MoreHorizontal,
  Clock3,
} from "lucide-react";
import { useStore } from "./store-provider";
import type { Appointment } from "@/lib/types";
import { statusLabels } from "@/lib/types";
import { timeLabel } from "@/lib/dates";
import { appointmentMessage, whatsappLink } from "@/lib/whatsapp";
export function AppointmentCard({
  appointment: a,
  onOpen,
  compact = false,
}: {
  appointment: Appointment;
  onOpen: () => void;
  compact?: boolean;
}) {
  const { store, mutate, toast, demo } = useStore();
  const client = store.clients.find((c) => c.id === a.client_id);
  if (!client) return null;
  async function remind() {
    try {
      if (demo) {
        await mutate({
          kind: "appointment",
          value: { id: a.id, action: "remind" },
        });
        toast(
          "Recordatorio marcado en la demostración. No se envió ningún mensaje.",
        );
        return;
      }
      const url = whatsappLink(
        client!.phone,
        appointmentMessage(
          store.templates.recordatorio,
          a,
          store.settings,
          window.location.origin,
          client!.name,
        ),
      );
      const tab = window.open("about:blank", "_blank");
      if (tab) tab.opener = null;
      await mutate({
        kind: "appointment",
        value: { id: a.id, action: "remind" },
      });
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch (e) {
      toast((e as Error).message);
    }
  }
  return (
    <article className={`appointment-card ${compact ? "compact" : ""}`}>
      <div className="appointment-time">
        <strong>{timeLabel(a.start_at)}</strong>
        <span>
          {Math.round((+new Date(a.end_at) - +new Date(a.start_at)) / 60000)}{" "}
          min
        </span>
      </div>
      <div className="appointment-main">
        <div className="appointment-title">
          <span
            className={`avatar client-avatar avatar-${store.clients.indexOf(client) % 4}`}
          >
            {client.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </span>
          <button className="text-button client-name" onClick={onOpen}>
            {client.name}
          </button>
        </div>
        <div className="appointment-meta">
          <span>Masaje a domicilio</span>
          <span className={`status status-${a.status}`}>
            {a.status === "confirmed" ? (
              <Check size={12} />
            ) : a.status === "scheduled" ? (
              <Clock3 size={12} />
            ) : null}
            {statusLabels[a.status]}
          </span>
        </div>
        {a.service_note && <p className="service-note">{a.service_note}</p>}
        {a.needs_notice && (
          <p className="notice-warning">Cliente sin avisar del cambio</p>
        )}
      </div>
      <div className="appointment-actions">
        {["scheduled", "confirmed"].includes(a.status) && (
          <button
            className={`reminder-button ${a.reminder_sent_at ? "reminded" : ""}`}
            onClick={remind}
          >
            <MessageCircle size={18} />
            <span>
              {a.reminder_sent_at
                ? "Recordar otra vez"
                : "Recordar por WhatsApp"}
            </span>
            {!a.reminder_sent_at && <span className="tiny-dot" />}
          </button>
        )}
        <button
          className="icon-button"
          aria-label={`Ver cita de ${client.name}`}
          onClick={onOpen}
        >
          {compact ? <ArrowUpRight size={21} /> : <MoreHorizontal size={22} />}
        </button>
      </div>
    </article>
  );
}
