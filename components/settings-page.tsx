"use client";
import { ModalPresence } from "./modal-presence";
import { useEffect, useState } from "react";
import {
  Save,
  Copy,
  Download,
  Bell,
  Smartphone,
  MessageCircle,
  RotateCcw,
  Check,
  ChevronDown,
  UserRound,
  Clock3,
  LogOut,
} from "lucide-react";
import { useStore, resetDemo } from "./store-provider";
import { Button } from "./ui/button";
import { Modal } from "./modal";
import { toCsv } from "@/lib/csv";
import { dayLabel, timeLabel } from "@/lib/dates";
import { browserSupabase } from "@/lib/supabase/browser";
import { clearOfflineAgenda } from "@/lib/offline";
import { useRouter } from "next/navigation";
import { signOutCurrentDevice } from "@/lib/auth";
import { TimePicker } from "./ui/time-picker";
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const templateLabels: Record<string, string> = {
  reserva_cliente: "Reserva del cliente",
  agendada_dueña: "Cita creada por ti",
  recordatorio: "Recordatorio de cita",
  confirmada_cliente: "Cliente confirma",
  cancelada_cliente: "Cliente cancela",
  modificada_cliente: "Cliente cambia horario",
  cancelada_dueña: "Tú cancelas la cita",
  modificada_dueña: "Tú cambias el horario",
};
export function SettingsPage() {
  const router = useRouter();
  const { store, mutate, busy, toast, demo } = useStore();
  const [settings, setSettings] = useState({ ...store.settings });
  const [templates, setTemplates] = useState({ ...store.templates });
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installInfo, setInstallInfo] = useState(false);
  const [reset, setReset] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await mutate({ kind: "settings", value: settings });
      toast("Tus ajustes quedaron guardados.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function enablePush() {
    if (demo) {
      toast(
        "Los avisos push se activan al conectar Supabase y las claves de notificaciones.",
      );
      return;
    }
    if (!("Notification" in window) || !("PushManager" in window)) {
      toast(
        "Instala la app para activar los avisos. En iPhone usa Safari y agrega la app a Inicio.",
      );
      return;
    }
    setPushBusy(true);
    try {
      if ((await Notification.requestPermission()) !== "granted")
        throw new Error(
          "Puedes permitir los avisos desde los ajustes de tu navegador.",
        );
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key)
        throw new Error("Falta configurar la clave pública de notificaciones.");
      const registration = await navigator.serviceWorker.ready;
      const padding = "=".repeat((4 - (key.length % 4)) % 4);
      const decoded = atob(
        (key + padding).replace(/-/g, "+").replace(/_/g, "/"),
      );
      const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: bytes,
      });
      const r = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Luisa-App": "1" },
        body: JSON.stringify(sub),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      setPushEnabled(true);
      toast("Avisos activados en este dispositivo.");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setPushBusy(false);
    }
  }
  function exportCsv() {
    const rows: unknown[][] = [
      [
        "Tipo",
        "Nombre",
        "Teléfono",
        "Notas",
        "Fecha de inicio (Lima)",
        "Hora (Lima)",
        "Fin (UTC)",
        "Estado",
        "Nota de cita",
        "Archivado",
      ],
    ];
    for (const c of store.clients)
      rows.push([
        "Cliente",
        c.name,
        c.phone,
        c.notes,
        "",
        "",
        "",
        "",
        "",
        c.archived_at ?? "",
      ]);
    for (const a of store.appointments) {
      const c = store.clients.find((c) => c.id === a.client_id);
      rows.push([
        "Cita",
        c?.name,
        c?.phone,
        "",
        dayLabel(a.start_at, "yyyy-MM-dd"),
        timeLabel(a.start_at),
        a.end_at,
        a.status,
        a.service_note,
        "",
      ]);
    }
    const url = URL.createObjectURL(
      new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `luisa-respaldo-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast("Respaldo descargado. Guárdalo en un lugar privado.");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">A TU MANERA</div>
          <h1>Pequeños ajustes, más calma</h1>
          <p>Todo lo necesario para que este espacio funcione para ti.</p>
        </div>
      </div>
      <div className="settings-layout">
        <div>
          <form className="content-card stack-form" onSubmit={save}>
            <div className="section-heading">
              <div>
                <span className="section-icon">
                  <UserRound size={23} />
                </span>
                <h2>Tu información</h2>
                <p>Así te verán tus clientes.</p>
              </div>
            </div>
            <div className="form-row">
              <label>
                Tu nombre
                <input
                  required
                  minLength={2}
                  value={settings.owner_name}
                  onChange={(e) =>
                    setSettings({ ...settings, owner_name: e.target.value })
                  }
                />
              </label>
              <label>
                Tu WhatsApp
                <input
                  required
                  inputMode="tel"
                  value={settings.owner_phone}
                  onChange={(e) =>
                    setSettings({ ...settings, owner_phone: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="section-heading settings-subheading">
              <div>
                <span className="section-icon">
                  <Clock3 size={23} />
                </span>
                <h2>El ritmo de tus citas</h2>
              </div>
            </div>
            <div className="form-row">
              <label>
                Duración de cada sesión
                <div className="input-unit">
                  <input
                    type="number"
                    min={10}
                    max={180}
                    required
                    value={settings.slot_minutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        slot_minutes: Number(e.target.value),
                      })
                    }
                  />
                  <span>minutos</span>
                </div>
              </label>
              <label>
                Reservas hacia adelante
                <div className="input-unit">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={settings.booking_window_days}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        booking_window_days: Number(e.target.value),
                      })
                    }
                  />
                  <span>días</span>
                </div>
              </label>
            </div>
            <p className="field-help">
              Los cambios de duración se aplican a citas nuevas. Las existentes
              mantienen su hora de fin.
            </p>
            <div className="form-row">
              <TimePicker
                label="Primera hora visible"
                value={settings.visible_start}
                onChange={(value) =>
                  setSettings({ ...settings, visible_start: value })
                }
              />
              <TimePicker
                label="Última hora visible"
                value={settings.visible_end}
                onChange={(value) =>
                  setSettings({ ...settings, visible_end: value })
                }
              />
            </div>
            <div className="form-row">
              <label>
                Anticipación para reservar
                <div className="input-unit">
                  <input
                    type="number"
                    min={0}
                    max={168}
                    required
                    value={settings.min_notice_hours}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        min_notice_hours: Number(e.target.value),
                      })
                    }
                  />
                  <span>horas</span>
                </div>
              </label>
              <label>
                Para cancelar o modificar
                <div className="input-unit">
                  <input
                    type="number"
                    min={0}
                    max={168}
                    required
                    value={settings.change_notice_hours}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        change_notice_hours: Number(e.target.value),
                      })
                    }
                  />
                  <span>horas antes</span>
                </div>
              </label>
            </div>
            <p className="field-help">
              Todos los horarios se muestran en hora de Perú (Lima).
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" loading={busy} disabled={busy}>
              <Save size={18} />
              {busy ? "Guardando…" : "Guardar mis ajustes"}
            </Button>
          </form>
          <section className="content-card templates-section">
            <div className="section-heading">
              <div>
                <span className="section-icon">
                  <MessageCircle size={23} />
                </span>
                <h2>Mensajes con tu voz</h2>
                <p>
                  Textos que se abren listos en WhatsApp. Tú decides cuándo
                  enviarlos.
                </p>
              </div>
            </div>
            <p className="field-help">
              Puedes usar {"{nombre}"}, {"{fecha}"}, {"{hora}"},{" "}
              {"{nombre_dueña}"}, {"{fecha_anterior}"}, {"{hora_anterior}"} y
              los enlaces de la cita.
            </p>
            {Object.entries(templates).map(([key, body]) => (
              <details key={key} className="template-details">
                <summary>
                  {templateLabels[key] ?? key}
                  <ChevronDown size={18} />
                </summary>
                <label>
                  <span className="sr-only">{templateLabels[key]}</span>
                  <textarea
                    rows={5}
                    value={body}
                    maxLength={3000}
                    onChange={(e) =>
                      setTemplates({ ...templates, [key]: e.target.value })
                    }
                  />
                </label>
              </details>
            ))}
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                try {
                  await mutate({ kind: "templates", value: templates });
                  toast("Mensajes guardados.");
                } catch (e) {
                  toast((e as Error).message);
                }
              }}
            >
              Guardar mensajes
            </Button>
          </section>
        </div>
        <aside className="settings-aside">
          <section className="share-card">
            <h3>Tu enlace de reservas</h3>
            <p>Compártelo en WhatsApp o en tus redes.</p>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${location.origin}/reservar`,
                  );
                  toast("Enlace copiado.");
                } catch {
                  toast("Tu enlace es " + location.origin + "/reservar");
                }
              }}
            >
              <Copy size={18} />
              Copiar mi enlace
            </Button>
          </section>
          <section className="content-card">
            <Smartphone size={27} strokeWidth={1.5} />
            <h3>Siempre a mano</h3>
            <p>
              Agrega Luisa a tu pantalla de inicio para abrirla como una app.
            </p>
            <Button
              variant="outline"
              onClick={async () => {
                if (prompt) {
                  await prompt.prompt();
                  setPrompt(null);
                } else setInstallInfo(true);
              }}
            >
              <Download size={18} />
              Instalar app
            </Button>
          </section>
          <section className="content-card">
            <Bell size={27} strokeWidth={1.5} />
            <h3>Que nada se te pase</h3>
            <p>
              Recibe avisos de nuevas citas y cambios, incluso con la app
              cerrada.
            </p>
            <Button
              variant="outline"
              disabled={pushBusy || pushEnabled}
              onClick={enablePush}
            >
              {pushEnabled ? <Check size={18} /> : <Bell size={18} />}{" "}
              {pushEnabled
                ? "Avisos activados"
                : pushBusy
                  ? "Activando…"
                  : "Activar avisos"}
            </Button>
          </section>
          <section className="content-card">
            <Download size={27} strokeWidth={1.5} />
            <h3>Una copia para ti</h3>
            <p>
              Descarga tus clientes y citas. Hazlo una vez al mes y guarda el
              archivo en un lugar privado.
            </p>
            <Button variant="outline" onClick={exportCsv}>
              Descargar mis datos
            </Button>
          </section>
          {!demo && (
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await signOutCurrentDevice(browserSupabase());
                  await clearOfflineAgenda();
                  router.replace("/login");
                  router.refresh();
                } catch (error) {
                  toast((error as Error).message);
                }
              }}
            >
              <LogOut size={18} />
              Cerrar sesión
            </Button>
          )}
          {demo && (
            <Button variant="ghost" onClick={() => setReset(true)}>
              <RotateCcw size={18} />
              Reiniciar demostración
            </Button>
          )}
        </aside>
      </div>
      <ModalPresence>
        {installInfo && (
          <Modal
            title="Tu agenda, a un toque"
            onClose={() => setInstallInfo(false)}
          >
            <div className="stack-form">
              <h3>En iPhone</h3>
              <p>
                Abre esta página en Safari, toca Compartir y luego «Agregar a
                pantalla de inicio».
              </p>
              <h3>En Android</h3>
              <p>
                Abre el menú de Chrome (⋮) y toca «Instalar aplicación» o
                «Agregar a pantalla de inicio».
              </p>
              <Button onClick={() => setInstallInfo(false)}>Entendido</Button>
            </div>
          </Modal>
        )}
      </ModalPresence>
      <ModalPresence>
        {reset && (
          <Modal
            title="¿Reiniciar la demostración?"
            onClose={() => setReset(false)}
          >
            <p>
              Se eliminarán los cambios de prueba de este navegador y volverán
              los datos ficticios iniciales.
            </p>
            <div className="dialog-actions">
              <Button variant="destructive" onClick={resetDemo}>
                Reiniciar demostración
              </Button>
              <Button variant="outline" onClick={() => setReset(false)}>
                Seguir probando
              </Button>
            </div>
          </Modal>
        )}
      </ModalPresence>
    </>
  );
}
