"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";
import { useStore } from "./store-provider";
import { Button } from "./ui/button";
import { AppointmentDetail } from "./appointment-detail";
import { AppointmentForm } from "./appointment-form";
import { AppointmentCard } from "./appointment-card";
import { dateKey, dayLabel, shiftDay, weekday, timeLabel } from "@/lib/dates";
export function CalendarPage() {
  const params = useSearchParams();
  const [day, setDay] = useState(params.get("dia") ?? dateKey());
  const [view, setView] = useState<"week" | "month">("week");
  const [filter, setFilter] = useState("active");
  const [detail, setDetail] = useState<string | null>(null);
  const [create, setCreate] = useState(false);
  const { store } = useStore();
  const start = shiftDay(day, -((weekday(day) + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(start, i));
  const appointments = store.appointments.filter(
    (a) =>
      filter === "all" ||
      (filter === "active" ? a.status !== "cancelled" : a.status === filter),
  );
  const selected = appointments
    .filter((a) => dateKey(a.start_at) === day)
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
  const month = day.slice(0, 7);
  const monthDays = new Date(
    Number(day.slice(0, 4)),
    Number(day.slice(5, 7)),
    0,
  ).getDate();
  const offset = (weekday(`${month}-01`) + 6) % 7;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">TIEMPO PARA LO QUE IMPORTA</div>
          <h1>Tu calendario</h1>
          <p>Cada cita tiene su momento. Encuéntralo aquí.</p>
        </div>
        <Button onClick={() => setCreate(true)}>
          <Plus size={20} />
          Nueva cita
        </Button>
      </div>
      <div className="calendar-toolbar">
        <div className="segmented-control">
          <button
            className={view === "week" ? "active" : ""}
            onClick={() => setView("week")}
          >
            Semana
          </button>
          <button
            className={view === "month" ? "active" : ""}
            onClick={() => setView("month")}
          >
            Mes
          </button>
        </div>
        <div className="calendar-navigation">
          <button
            className="icon-button"
            aria-label="Anterior"
            onClick={() =>
              setDay(shiftDay(day, view === "week" ? -7 : -monthDays))
            }
          >
            <ChevronLeft size={23} />
          </button>
          <h2>{dayLabel(`${day}T12:00:00-05:00`, "MMMM yyyy")}</h2>
          <button
            className="icon-button"
            aria-label="Siguiente"
            onClick={() =>
              setDay(shiftDay(day, view === "week" ? 7 : monthDays))
            }
          >
            <ChevronRight size={23} />
          </button>
          <Button variant="outline" onClick={() => setDay(dateKey())}>
            Hoy
          </Button>
        </div>
        <label className="sr-only" htmlFor="status-filter">
          Filtrar por estado
        </label>
        <select
          id="status-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="active">Sin canceladas</option>
          <option value="all">Todas las citas</option>
          <option value="scheduled">Por confirmar</option>
          <option value="confirmed">Confirmadas</option>
          <option value="cancelled">Canceladas</option>
          <option value="completed">Atendidas</option>
        </select>
      </div>
      <div className="calendar-legend">
        <span>
          <i className="legend-confirmed" />
          Confirmada
        </span>
        <span>
          <i className="legend-scheduled" />
          Por confirmar
        </span>
        <span>
          <i className="legend-block" />
          Bloqueo puntual
        </span>
        <span>
          <i className="legend-rule" />
          Horario fijo
        </span>
      </div>
      {view === "week" ? (
        <div className="week-calendar">
          {week.map((d) => {
            const appts = appointments
              .filter((a) => dateKey(a.start_at) === d)
              .sort((a, b) => a.start_at.localeCompare(b.start_at));
            const blocks = store.blocks.filter(
              (b) => dateKey(b.start_at) <= d && dateKey(b.end_at) >= d,
            );
            const rules = store.fixedRules.filter(
              (r) => r.active && r.weekday === weekday(d),
            );
            return (
              <div
                className={`week-day ${d === day ? "selected-day" : ""}`}
                key={d}
              >
                <button className="week-day-header" onClick={() => setDay(d)}>
                  <span>{dayLabel(`${d}T12:00:00-05:00`, "EEE")}</span>
                  <strong className={d === dateKey() ? "today-number" : ""}>
                    {d.slice(-2)}
                  </strong>
                </button>
                <div className="week-day-events">
                  {rules.map((r) => (
                    <Link
                      href={`/disponibilidad?regla=${r.id}`}
                      className="calendar-event rule-event"
                      key={r.id}
                    >
                      <small>
                        {r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)}
                      </small>
                      {r.label}
                    </Link>
                  ))}
                  {blocks.map((b) => (
                    <Link
                      href={`/disponibilidad?bloque=${b.id}`}
                      className="calendar-event block-event"
                      key={b.id}
                    >
                      <small>
                        {timeLabel(b.start_at)} – {timeLabel(b.end_at)}
                      </small>
                      {b.reason}
                    </Link>
                  ))}
                  {appts.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setDay(d);
                        setDetail(a.id);
                      }}
                      className={`calendar-event event-${a.status}`}
                    >
                      <small>{timeLabel(a.start_at)}</small>
                      <strong>
                        {store.clients.find((c) => c.id === a.client_id)?.name}
                      </strong>
                      <span>
                        {a.status === "confirmed"
                          ? "Confirmada"
                          : a.status === "scheduled"
                            ? "Por confirmar"
                            : ""}
                      </span>
                    </button>
                  ))}
                  <button
                    className="calendar-add"
                    aria-label={`Agendar el ${d}`}
                    onClick={() => {
                      setDay(d);
                      setCreate(true);
                    }}
                  >
                    <Plus size={17} />
                    <span>Agendar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="month-calendar">
          {[
            "Lunes",
            "Martes",
            "Miércoles",
            "Jueves",
            "Viernes",
            "Sábado",
            "Domingo",
          ].map((d) => (
            <div className="month-weekday" key={d}>
              {d.slice(0, 3)}
            </div>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <div key={`blank${i}`} className="month-blank" />
          ))}
          {Array.from({ length: monthDays }, (_, i) => {
            const d = `${month}-${String(i + 1).padStart(2, "0")}`;
            const appts = appointments.filter((a) => dateKey(a.start_at) === d);
            return (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={`month-day ${d === day ? "selected-day" : ""} ${d === dateKey() ? "month-today" : ""}`}
              >
                <strong>{i + 1}</strong>
                <span className="month-markers">
                  {appts.slice(0, 4).map((a) => (
                    <i key={a.id} className={`event-${a.status}`} />
                  ))}
                  {store.blocks.some(
                    (b) => dateKey(b.start_at) <= d && dateKey(b.end_at) >= d,
                  ) && <i className="legend-block" />}
                  {store.fixedRules.some(
                    (r) => r.active && r.weekday === weekday(d),
                  ) && <i className="legend-rule" />}
                </span>
                {appts.length > 0 && (
                  <small>
                    {appts.length} cita{appts.length !== 1 ? "s" : ""}
                  </small>
                )}
              </button>
            );
          })}
        </div>
      )}
      <section className="selected-day-agenda">
        <div className="section-heading">
          <h2>
            {day === dateKey()
              ? "Hoy"
              : dayLabel(`${day}T12:00:00-05:00`, "EEEE d 'de' MMMM")}
          </h2>
          <Button variant="ghost" onClick={() => setCreate(true)}>
            Agendar aquí <ArrowUpRight size={18} />
          </Button>
        </div>
        {selected.length ? (
          selected.map((a) => (
            <AppointmentCard
              key={a.id}
              appointment={a}
              onOpen={() => setDetail(a.id)}
            />
          ))
        ) : (
          <div className="empty-state">
            <CalendarDays size={32} />
            <h3>Espacio en tu agenda</h3>
            <p>No hay citas para este día.</p>
          </div>
        )}
      </section>
      {detail && (
        <AppointmentDetail id={detail} onClose={() => setDetail(null)} />
      )}{" "}
      {create && (
        <AppointmentForm initialDay={day} onClose={() => setCreate(false)} />
      )}
    </>
  );
}
