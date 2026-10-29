import { dateKey, localInstant, shiftDay } from "./dates";
import { defaultTemplates } from "./templates";
import type { Appointment, Store } from "./types";
export const defaultSettings = {
  id: 1,
  owner_name: "Luisa",
  owner_phone: "51982280618",
  slot_minutes: 40,
  booking_window_days: 14,
  min_notice_hours: 2,
  change_notice_hours: 2,
  visible_start: "06:00",
  visible_end: "22:00",
  timezone: "America/Lima",
};
export function createDemoStore(): Store {
  const fakeId = (number: number) =>
    `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
  const today = dateKey();
  const created = new Date().toISOString();
  const clients = [
    ["Elena Mendoza", "51900000001", "Prefiere las sesiones por la mañana."],
    ["María Fernanda", "51900000002", "A veces reserva para su mamá."],
    ["Carmen Torres", "51900000003", ""],
    ["Ana Lucía Ramos", "51900000004", ""],
    ["Isabel Flores", "51900000005", ""],
  ].map(([name, phone, notes], i) => ({
    id: fakeId(i + 1),
    name,
    phone,
    notes,
    source: "owner" as const,
    archived_at: null,
    created_at: created,
  }));
  const entries: [number, string, number, Appointment["status"], string][] = [
    [0, "09:20", 0, "confirmed", ""],
    [0, "11:20", 1, "scheduled", "La sesión es para mi mamá."],
    [0, "15:20", 2, "confirmed", ""],
    [1, "10:00", 3, "scheduled", ""],
    [1, "16:00", 4, "confirmed", ""],
    [2, "10:40", 0, "scheduled", ""],
    [-7, "09:20", 0, "completed", ""],
    [-5, "15:20", 1, "completed", ""],
    [-3, "10:00", 2, "completed", ""],
  ];
  const appointments = entries.map(([offset, time, ci, status, note], i) => {
    const start = localInstant(shiftDay(today, offset), time);
    return {
      id: fakeId(i + 100),
      client_id: clients[ci].id,
      start_at: start.toISOString(),
      end_at: new Date(+start + 40 * 60000).toISOString(),
      status,
      source: "owner" as const,
      service_note: note,
      action_token: `demo-token-${i}`,
      reminder_sent_at: i === 0 ? created : null,
      cancelled_by: null,
      needs_notice: false,
      created_at: created,
      updated_at: created,
    };
  });
  return {
    settings: defaultSettings,
    clients,
    appointments,
    fixedRules: [
      {
        id: fakeId(300),
        weekday: 0,
        start_time: "06:00",
        end_time: "22:00",
        label: "Domingo de descanso",
        active: true,
      },
    ],
    blocks: [
      {
        id: fakeId(301),
        start_at: localInstant(shiftDay(today, 1), "12:00").toISOString(),
        end_at: localInstant(shiftDay(today, 1), "15:00").toISOString(),
        reason: "Un momento para mí",
      },
    ],
    notifications: [
      {
        id: "demo-notice",
        type: "created",
        appointment_id: appointments[1].id,
        title: "María Fernanda reservó una cita",
        read_at: null,
        created_at: created,
      },
    ],
    templates: { ...defaultTemplates },
    events: appointments.map((a, i) => ({
      id: `demo-event-${i}`,
      appointment_id: a.id,
      event: "created",
      actor: "owner",
      payload: {},
      created_at: created,
    })),
  };
}
