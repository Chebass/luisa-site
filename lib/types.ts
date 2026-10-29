export type Status =
  "scheduled" | "confirmed" | "cancelled" | "completed" | "no_show";
export type Client = {
  id: string;
  name: string;
  phone: string;
  notes: string;
  source: "public" | "owner";
  archived_at: string | null;
  created_at: string;
};
export type Appointment = {
  id: string;
  client_id: string;
  start_at: string;
  end_at: string;
  status: Status;
  source: "public" | "owner";
  service_note: string;
  action_token: string;
  reminder_sent_at: string | null;
  cancelled_by: string | null;
  needs_notice: boolean;
  created_at: string;
  updated_at: string;
};
export type FixedRule = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  label: string;
  active: boolean;
};
export type Block = {
  id: string;
  start_at: string;
  end_at: string;
  reason: string;
};
export type Settings = {
  id: number;
  owner_name: string;
  owner_phone: string;
  slot_minutes: number;
  booking_window_days: number;
  min_notice_hours: number;
  change_notice_hours: number;
  visible_start: string;
  visible_end: string;
  timezone: string;
};
export type Notice = {
  id: string;
  type: string;
  appointment_id: string | null;
  title: string;
  read_at: string | null;
  created_at: string;
};
export type AppointmentEvent = {
  id: string;
  appointment_id: string;
  event: string;
  actor: string;
  payload: Record<string, unknown>;
  created_at: string;
};
export type Store = {
  settings: Settings;
  clients: Client[];
  appointments: Appointment[];
  fixedRules: FixedRule[];
  blocks: Block[];
  notifications: Notice[];
  templates: Record<string, string>;
  events: AppointmentEvent[];
};
export const statusLabels: Record<Status, string> = {
  scheduled: "Por confirmar",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Atendida",
  no_show: "No asistió",
};
