"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Plus,
  ArrowUpRight,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Leaf,
  Copy,
  Sun,
} from "lucide-react";
import { useStore } from "./store-provider";
import { Button } from "./ui/button";
import { AppointmentCard } from "./appointment-card";
import { AppointmentDetail } from "./appointment-detail";
import { AppointmentForm } from "./appointment-form";
import { dateKey, dayLabel, shiftDay } from "@/lib/dates";
export function HomePage() {
  const { store, toast } = useStore();
  const [newAppointment, setNewAppointment] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const today = dateKey();
  const todays = store.appointments
    .filter((a) => dateKey(a.start_at) === today && a.status !== "cancelled")
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
  const upcoming = store.appointments
    .filter(
      (a) =>
        dateKey(a.start_at) > today &&
        ["scheduled", "confirmed"].includes(a.status),
    )
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
  const pending = todays.filter((a) => a.status === "scheduled").length;
  const confirmed = todays.filter((a) => a.status === "confirmed").length;
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/reservar`);
      toast("Enlace copiado. Ya puedes compartirlo.");
    } catch {
      toast("Tu enlace de reservas es " + window.location.origin + "/reservar");
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="little-line" />
            TU DÍA, CON CALMA
          </div>
          <h1>
            Hola, {store.settings.owner_name}
            <span className="heading-flower">✳</span>
          </h1>
          <p>Hoy es un buen día para hacer sentir bien.</p>
        </div>
        <Button onClick={() => setNewAppointment(true)}>
          <Plus size={21} />
          Nueva cita
        </Button>
      </div>
      <section className="welcome-banner">
        <div className="welcome-copy">
          <span className="hero-kicker">
            <Sun size={16} /> CADA ENCUENTRO, UN MOMENTO DE PAZ
          </span>
          <h2>
            Cuida de los demás.
            <br />
            <em>Nosotros cuidamos tu tiempo.</em>
          </h2>
          <p>
            Tu agenda en orden, tu mente en calma.
            <br />
            Todo lo que necesitas para acompañar su bienestar.
          </p>
          <Link href="/calendario">
            Ver mi calendario{" "}
            <span>
              <ArrowUpRight size={19} />
            </span>
          </Link>
        </div>
        <div
          className="hero-art"
          role="img"
          aria-label="Luz cálida, piedras de masaje y una rama de olivo"
        >
          <div className="sun-halo" />
          <div className="arch arch-one" />
          <div className="arch arch-two" />
          <div className="stone stone-one" />
          <div className="stone stone-two" />
          <div className="stone stone-three" />
          <div className="sand-line sand-one" />
          <div className="sand-line sand-two" />
          <div className="olive-branch">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} style={{ "--i": i } as React.CSSProperties} />
            ))}
          </div>
          <span className="art-caption">RESPIRA. ESTÁS AQUÍ.</span>
        </div>
      </section>
      <section className="stats-grid" aria-label="Resumen de hoy">
        {[
          {
            label: "Citas para hoy",
            value: todays.length,
            icon: CalendarDays,
            color: "sand",
            note: "Un día para conectar",
          },
          {
            label: "Confirmadas",
            value: confirmed,
            icon: Check,
            color: "sage",
            note: "Todo listo para recibirlas",
          },
          {
            label: "Por confirmar",
            value: pending,
            icon: Clock3,
            color: "peach",
            note: pending
              ? "Puedes enviarles un recordatorio"
              : "Tu agenda está al día",
          },
        ].map(({ label, value, icon: Icon, color, note }) => (
          <div className="stat-card" key={label}>
            <div className={`stat-icon ${color}`}>
              <Icon size={23} strokeWidth={1.5} />
            </div>
            <div>
              <span className="stat-label">{label}</span>
              <div className="stat-value">
                {value.toString().padStart(2, "0")}
                <small>{note}</small>
              </div>
            </div>
          </div>
        ))}
      </section>
      <div className="home-columns">
        <div>
          <section className="today-section">
            <div className="section-heading">
              <div>
                <h2>
                  Tu agenda de hoy{" "}
                  <span className="count-pill">{todays.length}</span>
                </h2>
                <p>{dayLabel(new Date(), "EEEE, d 'de' MMMM")}</p>
              </div>
              <Link href="/calendario" className="subtle-link">
                Ver todo <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="appointment-list">
              {todays.length ? (
                todays.map((a) => (
                  <AppointmentCard
                    key={a.id}
                    appointment={a}
                    onOpen={() => setDetail(a.id)}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <Leaf size={34} />
                  <h3>Un día con espacio para ti</h3>
                  <p>No tienes citas para hoy.</p>
                  <Button
                    variant="outline"
                    onClick={() => setNewAppointment(true)}
                  >
                    Agendar una cita
                  </Button>
                </div>
              )}
            </div>
          </section>
          <section className="upcoming-section">
            <div className="section-heading">
              <h2>En los próximos días</h2>
              <span className="muted">Sin prisa, pero con un plan.</span>
            </div>
            {upcoming.slice(0, 3).map((a) => (
              <div className="upcoming-row" key={a.id}>
                <div className="upcoming-date">
                  <strong>{dayLabel(a.start_at, "d")}</strong>
                  <span>
                    {dateKey(a.start_at) === shiftDay(today, 1)
                      ? "MAÑANA"
                      : dayLabel(a.start_at, "EEE")}
                  </span>
                </div>
                <div className="upcoming-info">
                  <strong>
                    {store.clients.find((c) => c.id === a.client_id)?.name}
                  </strong>
                  <span>
                    {dayLabel(a.start_at, "EEEE")} ·{" "}
                    {dayLabel(a.start_at, "h:mm a")}
                  </span>
                </div>
                <button
                  className="icon-button"
                  aria-label="Ver cita"
                  onClick={() => setDetail(a.id)}
                >
                  <ArrowUpRight size={20} />
                </button>
              </div>
            ))}
            {!upcoming.length && (
              <p className="empty-inline">Todavía no hay próximas citas.</p>
            )}
          </section>
        </div>
        <aside className="home-aside">
          <MiniCalendar />
          <div className="planning-card">
            <span className="planning-icon">
              <Leaf size={23} strokeWidth={1.5} />
            </span>
            <h3>Haz espacio para ti</h3>
            <p>
              Revisa tus bloqueos de las próximas 2 semanas y reserva tiempo
              para lo que te hace bien.
            </p>
            <Link href="/disponibilidad">
              Organizar mis horarios <ArrowRight size={18} />
            </Link>
          </div>
          <div className="share-card">
            <span className="eyebrow">MÁS FÁCIL PARA TUS CLIENTES</span>
            <h3>Un enlace. Su próxima pausa.</h3>
            <p>Comparte tu página para que reserven cuando les venga bien.</p>
            <Button variant="outline" onClick={copy}>
              <Copy size={17} />
              Copiar enlace de reservas
            </Button>
          </div>
        </aside>
      </div>
      {newAppointment && (
        <AppointmentForm onClose={() => setNewAppointment(false)} />
      )}{" "}
      {detail && (
        <AppointmentDetail id={detail} onClose={() => setDetail(null)} />
      )}
    </>
  );
}
function MiniCalendar() {
  const { store } = useStore();
  const today = dateKey();
  const month = today.slice(0, 7);
  const days = new Date(
    Number(today.slice(0, 4)),
    Number(today.slice(5, 7)),
    0,
  ).getDate();
  const offset = (new Date(`${month}-01T12:00:00Z`).getUTCDay() + 6) % 7;
  return (
    <div className="mini-calendar">
      <div className="mini-calendar-heading">
        <h3>{dayLabel(new Date(), "MMMM yyyy")}</h3>
        <Link
          href="/calendario"
          className="icon-button"
          aria-label="Abrir calendario"
        >
          <ArrowUpRight size={18} />
        </Link>
      </div>
      <div className="mini-grid">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span className="weekday" key={i}>
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = `${month}-${String(i + 1).padStart(2, "0")}`;
          const has = store.appointments.some(
            (a) => dateKey(a.start_at) === day && a.status !== "cancelled",
          );
          return (
            <Link
              key={day}
              href={`/calendario?dia=${day}`}
              className={`mini-day ${day === today ? "is-today" : ""} ${has ? "has-appointments" : ""}`}
            >
              {i + 1}
            </Link>
          );
        })}
      </div>
      <div className="calendar-footnote">
        <span className="tiny-dot" /> Días con citas
      </div>
    </div>
  );
}
