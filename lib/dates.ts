import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { addDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
export const TIMEZONE = "America/Lima";
export const dateKey = (value: Date | string = new Date()) =>
  formatInTimeZone(value, TIMEZONE, "yyyy-MM-dd");
export const timeLabel = (value: Date | string) =>
  formatInTimeZone(value, TIMEZONE, "h:mm a", { locale: es });
export const dayLabel = (value: Date | string, pattern = "EEEE d 'de' MMMM") =>
  formatInTimeZone(value, TIMEZONE, pattern, { locale: es });
export const localInstant = (day: string, time: string) =>
  fromZonedTime(`${day}T${time}`, TIMEZONE);
export const shiftDay = (day: string, amount: number) =>
  format(addDays(parseISO(day), amount), "yyyy-MM-dd");
export const weekday = (day: string) =>
  new Date(`${day}T12:00:00Z`).getUTCDay();
export const minutes = (time: string) =>
  Number(time.split(":")[0]) * 60 + Number(time.split(":")[1]);
export const clock = (value: number) =>
  `${Math.floor(value / 60)
    .toString()
    .padStart(2, "0")}:${(value % 60).toString().padStart(2, "0")}`;
