import { dayLabel, timeLabel } from "./dates";
import { renderTemplate } from "./templates";
import type { Appointment, Settings } from "./types";
export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const phone = digits.length === 9 ? `51${digits}` : digits;
  if (!/^519\d{8}$/.test(phone))
    throw new Error("Escribe un celular peruano válido de 9 dígitos.");
  return phone;
}
export function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}
export function appointmentMessage(
  body: string,
  a: Pick<Appointment, "start_at" | "action_token">,
  settings: Settings,
  origin: string,
  name = "",
  previous?: string,
) {
  return renderTemplate(body, {
    nombre: name,
    nombre_dueña: settings.owner_name,
    fecha: dayLabel(a.start_at),
    hora: timeLabel(a.start_at),
    fecha_anterior: previous ? dayLabel(previous) : "",
    hora_anterior: previous ? timeLabel(previous) : "",
    enlace_confirmar: `${origin}/c/${a.action_token}/confirmar`,
    enlace_cancelar: `${origin}/c/${a.action_token}/cancelar`,
    enlace_modificar: `${origin}/c/${a.action_token}/modificar`,
    enlace_reservas: `${origin}/reservar`,
  });
}
