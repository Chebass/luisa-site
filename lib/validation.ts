import { z } from "zod";
import { normalizePhone } from "./whatsapp";
const phone = z.string().transform((v, ctx) => {
  try {
    return normalizePhone(v);
  } catch {
    ctx.addIssue({
      code: "custom",
      message: "Escribe un celular peruano válido.",
    });
    return z.NEVER;
  }
});
export const bookingSchema = z.object({
  override_blocks: z.boolean().optional(),
  name: z.string().trim().min(2, "Escribe tu nombre.").max(100),
  phone,
  start_at: z.iso.datetime({ offset: true }),
  service_note: z.string().trim().max(500).default(""),
  turnstile: z.string().max(4096).optional(),
  website: z.string().max(0).optional(),
});
export const settingsSchema = z
  .object({
    owner_name: z.string().trim().min(2).max(80),
    owner_phone: phone,
    slot_minutes: z.number().int().min(10).max(180),
    booking_window_days: z.number().int().min(1).max(60),
    min_notice_hours: z.number().min(0).max(168),
    change_notice_hours: z.number().min(0).max(168),
    visible_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    visible_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .refine((s) => s.visible_start < s.visible_end, {
    message: "La hora de fin debe ser posterior al inicio.",
  });
export const clientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(100),
  phone,
  notes: z.string().max(2000).default(""),
  archived_at: z.iso.datetime().nullable().optional(),
});
export const blockSchema = z
  .object({
    id: z.string().uuid().optional(),
    start_at: z.iso.datetime({ offset: true }),
    end_at: z.iso.datetime({ offset: true }),
    reason: z.string().trim().min(1).max(200),
  })
  .refine((b) => new Date(b.end_at) > new Date(b.start_at), {
    message: "Revisa el inicio y fin del bloqueo.",
  });
export const ruleSchema = z
  .object({
    id: z.string().uuid().optional(),
    weekday: z.number().int().min(0).max(6),
    start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    label: z.string().trim().min(1).max(120),
    active: z.boolean().default(true),
  })
  .refine((r) => r.end_time > r.start_time, {
    message: "La hora de fin debe ser posterior al inicio.",
  });
