"use client";
import { useState } from "react";
import { Bell, CheckCheck, ArrowUpRight } from "lucide-react";
import { useStore } from "./store-provider";
import { Button } from "./ui/button";
import { AppointmentDetail } from "./appointment-detail";
import { dayLabel, timeLabel } from "@/lib/dates";
export function NotificationsPage() {
  const { store, mutate, busy, toast } = useStore();
  const [detail, setDetail] = useState<string | null>(null);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">AL DÍA, SIN ESFUERZO</div>
          <h1>Novedades en tu agenda</h1>
          <p>Todo lo que ha pasado, en un solo lugar.</p>
        </div>
        <Button
          variant="outline"
          disabled={busy || !store.notifications.some((n) => !n.read_at)}
          onClick={async () => {
            try {
              await mutate({ kind: "read" });
            } catch (e) {
              toast((e as Error).message);
            }
          }}
        >
          <CheckCheck size={19} />
          Marcar como leídas
        </Button>
      </div>
      <div className="notifications-list">
        {store.notifications.map((n) => (
          <button
            key={n.id}
            className={`notification-row ${!n.read_at ? "unread" : ""}`}
            onClick={() => {
              if (n.appointment_id) setDetail(n.appointment_id);
            }}
          >
            <span className="section-icon">
              <Bell size={21} />
            </span>
            <span>
              <strong>{n.title}</strong>
              <small>
                {dayLabel(n.created_at, "EEEE d MMM")} ·{" "}
                {timeLabel(n.created_at)}
              </small>
            </span>
            {!n.read_at && <i className="tiny-dot" />}
            <ArrowUpRight size={20} />
          </button>
        ))}
        {!store.notifications.length && (
          <div className="empty-state">
            <Bell size={35} />
            <h3>Todo en calma</h3>
            <p>Cuando haya novedades, aparecerán aquí.</p>
          </div>
        )}
      </div>
      {detail && (
        <AppointmentDetail id={detail} onClose={() => setDetail(null)} />
      )}
    </>
  );
}
