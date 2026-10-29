import {
  clock,
  dateKey,
  localInstant,
  minutes,
  shiftDay,
  weekday,
} from "./dates";
import type { Appointment, Block, FixedRule, Settings } from "./types";
export type AvailabilityInput = {
  day: string;
  settings: Settings;
  rules: FixedRule[];
  blocks: Block[];
  appointments: Pick<Appointment, "id" | "start_at" | "end_at" | "status">[];
  now?: Date;
  excludeId?: string;
  owner?: boolean;
  durationMinutes?: number;
  overrideBlocks?: boolean;
};
export const overlaps = (
  start: Date,
  end: Date,
  otherStart: Date,
  otherEnd: Date,
) => start < otherEnd && end > otherStart;
export function availableSlots({
  day,
  settings,
  rules,
  blocks,
  appointments,
  now = new Date(),
  excludeId,
  owner = false,
  durationMinutes = settings.slot_minutes,
  overrideBlocks = false,
}: AvailabilityInput) {
  const today = dateKey(now);
  if (
    day < today ||
    (!owner && day >= shiftDay(today, settings.booking_window_days))
  )
    return [];
  const result: { start_at: string; end_at: string; time: string }[] = [];
  for (
    let m = minutes(settings.visible_start);
    m + durationMinutes <= minutes(settings.visible_end);
    m += settings.slot_minutes
  ) {
    const start = localInstant(day, clock(m));
    const end = new Date(+start + durationMinutes * 60000);
    if (+start < +now + (owner ? 0 : settings.min_notice_hours * 3600000))
      continue;
    if (
      !(owner && overrideBlocks) &&
      rules.some(
        (r) =>
          r.active &&
          r.weekday === weekday(day) &&
          overlaps(
            start,
            end,
            localInstant(day, r.start_time),
            localInstant(day, r.end_time),
          ),
      )
    )
      continue;
    if (
      !(owner && overrideBlocks) &&
      blocks.some((b) =>
        overlaps(start, end, new Date(b.start_at), new Date(b.end_at)),
      )
    )
      continue;
    if (
      appointments.some(
        (a) =>
          a.id !== excludeId &&
          ["scheduled", "confirmed"].includes(a.status) &&
          overlaps(start, end, new Date(a.start_at), new Date(a.end_at)),
      )
    )
      continue;
    result.push({
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      time: clock(m),
    });
  }
  return result;
}
