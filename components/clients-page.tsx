"use client";
import { ModalPresence } from "./modal-presence";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Plus,
  ArrowUpRight,
  MessageCircle,
  CalendarDays,
  Archive,
  UserRound,
} from "lucide-react";
import { useStore } from "./store-provider";
import { Button } from "./ui/button";
import { Modal } from "./modal";
import { AppointmentForm } from "./appointment-form";
import { AppointmentDetail } from "./appointment-detail";
import { dateKey, dayLabel, timeLabel } from "@/lib/dates";
import { statusLabels, type Client } from "@/lib/types";
import { normalizePhone, whatsappLink } from "@/lib/whatsapp";
export function ClientsPage() {
  const { store, mutate, busy, toast, demo } = useStore();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(false);
  const [selected, setSelected] = useState<string | null>(
    params.get("cliente"),
  );
  const [edit, setEdit] = useState<Partial<Client> | null>(null);
  const [booking, setBooking] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirmArchive, setConfirmArchive] = useState(false);
  const client = store.clients.find((c) => c.id === selected);
  const history = store.appointments
    .filter((a) => a.client_id === selected)
    .sort((a, b) => b.start_at.localeCompare(a.start_at));
  const clients = store.clients
    .filter(
      (c) =>
        Boolean(c.archived_at) === archived &&
        `${c.name} ${c.phone}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await mutate({
        kind: "client",
        value: { ...edit, phone: normalizePhone(edit?.phone ?? "") },
      });
      setEdit(null);
      toast("Ficha guardada.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PERSONAS, NO SOLO CITAS</div>
          <h1>Tus clientes</h1>
          <p>Un pequeño espacio para conocerlos mejor.</p>
        </div>
        <Button
          onClick={() => {
            setError("");
            setEdit({ name: "", phone: "", notes: "" });
          }}
        >
          <Plus size={20} />
          Agregar cliente
        </Button>
      </div>
      <div className="list-toolbar">
        <label className="search-field">
          <Search size={21} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o celular"
            aria-label="Buscar clientes"
          />
        </label>
        <button
          className={`filter-button ${archived ? "active" : ""}`}
          onClick={() => setArchived(!archived)}
        >
          <Archive size={18} />
          {archived ? "Ver activos" : "Archivados"}
        </button>
      </div>
      <p className="results-label">
        {clients.length} personas {archived ? "archivadas" : "en tu espacio"}
      </p>
      <div className="clients-grid">
        {clients.map((c, i) => {
          const visits = store.appointments.filter(
            (a) => a.client_id === c.id && a.status === "completed",
          );
          const last = visits.sort((a, b) =>
            b.start_at.localeCompare(a.start_at),
          )[0];
          return (
            <button
              className="client-card"
              key={c.id}
              onClick={() => {
                setSelected(c.id);
                setConfirmArchive(false);
              }}
            >
              <div className="client-card-top">
                <span className={`avatar avatar-large avatar-${i % 4}`}>
                  {c.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <ArrowUpRight size={21} />
              </div>
              <h2>{c.name}</h2>
              <span className="client-phone">
                +{c.phone.slice(0, 2)} {c.phone.slice(2)}
              </span>
              <div className="client-card-foot">
                <span>{visits.length} visitas</span>
                <small>
                  {last
                    ? `Última: ${dayLabel(last.start_at, "d MMM")}`
                    : "Por conocerse"}
                </small>
              </div>
            </button>
          );
        })}
      </div>
      {!clients.length && (
        <div className="empty-state">
          <UserRound size={35} />
          <h3>
            {query
              ? "No encontramos ese cliente"
              : "Aquí empieza una relación de bienestar"}
          </h3>
          <p>
            {query
              ? "Prueba con otro nombre o teléfono."
              : "Las personas que agenden aparecerán aquí."}
          </p>
        </div>
      )}
      <ModalPresence>
        {client && !edit && !booking && (
          <Modal
            title="Su espacio de bienestar"
            onClose={() => setSelected(null)}
            wide
          >
            <div className="client-profile">
              <span className="avatar avatar-large">{client.name[0]}</span>
              <div>
                <h2>{client.name}</h2>
                <p>+{client.phone}</p>
              </div>
            </div>
            <div className="profile-stats">
              <span>
                <strong>{history.length}</strong>Citas en total
              </span>
              <span>
                <strong>
                  {history.filter((a) => a.status === "completed").length}
                </strong>
                Atendidas
              </span>
              <span>
                <strong>
                  {history.filter((a) => a.status === "cancelled").length}
                </strong>
                Canceladas
              </span>
            </div>
            <div className="detail-contact">
              <Button onClick={() => setBooking(client.id)}>
                <Plus size={18} />
                Agendar cita
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (demo) {
                    toast("Este teléfono es ficticio.");
                    return;
                  }
                  window.open(
                    whatsappLink(
                      client.phone,
                      `Hola ${client.name}, soy ${store.settings.owner_name}.`,
                    ),
                    "_blank",
                    "noopener,noreferrer",
                  );
                }}
              >
                <MessageCircle size={18} />
                WhatsApp
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setError("");
                  setEdit({ ...client });
                }}
              >
                Editar ficha
              </Button>
            </div>
            <h3>Notas privadas</h3>
            <p className="note-box">
              {client.notes || "Todavía no has añadido notas."}
            </p>
            <p className="field-help">
              Solo tú puedes ver estas notas. Evita guardar información clínica.
            </p>
            <h3 className="history-heading">Sus citas</h3>
            <div className="client-history">
              {history.map((a) => (
                <button key={a.id} onClick={() => setDetail(a.id)}>
                  <CalendarDays size={21} />
                  <span>
                    <strong>{dayLabel(a.start_at, "EEEE d MMM")}</strong>
                    <small>
                      {timeLabel(a.start_at)} ·{" "}
                      {dateKey(a.start_at) < dateKey() ? "Pasada" : "Próxima"}
                    </small>
                  </span>
                  <span className={`status status-${a.status}`}>
                    {statusLabels[a.status]}
                  </span>
                  <ArrowUpRight size={18} />
                </button>
              ))}
              {!history.length && (
                <p className="empty-inline">Todavía no tiene citas.</p>
              )}
            </div>
            {confirmArchive ? (
              <div className="confirmation-box">
                <p>
                  Se conservará todo su historial. Si vuelve a reservar, su
                  ficha se reactivará.
                </p>
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      await mutate({
                        kind: "client",
                        value: {
                          ...client,
                          archived_at: new Date().toISOString(),
                        },
                      });
                      setSelected(null);
                      setConfirmArchive(false);
                      toast("Cliente archivado.");
                    } catch (e) {
                      toast((e as Error).message);
                    }
                  }}
                >
                  Sí, archivar cliente
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmArchive(false)}
                >
                  Mantener activo
                </Button>
              </div>
            ) : (
              !client.archived_at && (
                <Button
                  variant="ghost"
                  className="danger-text"
                  onClick={() => setConfirmArchive(true)}
                >
                  <Archive size={17} />
                  Archivar cliente
                </Button>
              )
            )}
          </Modal>
        )}
      </ModalPresence>
      <ModalPresence>
        {edit && (
          <Modal
            title={edit.id ? "Editar ficha" : "Agregar un cliente"}
            onClose={() => setEdit(null)}
          >
            <form className="stack-form" onSubmit={save}>
              <label>
                Nombre
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={edit.name ?? ""}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                />
              </label>
              <label>
                Celular
                <input
                  required
                  inputMode="tel"
                  value={edit.phone ?? ""}
                  onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                />
              </label>
              <label>
                Notas privadas
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={edit.notes ?? ""}
                  onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
                  placeholder="Preferencias o detalles para recordar. Sin datos de salud."
                />
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <Button loading={busy} disabled={busy}>
                {busy ? "Guardando…" : "Guardar ficha"}
              </Button>
            </form>
          </Modal>
        )}
      </ModalPresence>
      <ModalPresence>
        {booking && (
          <AppointmentForm
            clientId={booking}
            onClose={() => setBooking(null)}
          />
        )}
      </ModalPresence>{" "}
      <ModalPresence>
        {detail && (
          <AppointmentDetail id={detail} onClose={() => setDetail(null)} />
        )}
      </ModalPresence>
    </>
  );
}
