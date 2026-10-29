"use client";
import { useId, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { es } from "react-day-picker/locale";
import { format, parseISO, isValid } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useOverlayContainer } from "./overlay-container";
import { dateKey } from "@/lib/dates";
type Props = {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  id?: string;
  label?: string;
  required?: boolean;
};
export function DatePicker({
  value,
  onChange,
  min,
  max,
  id,
  label,
  required = false,
}: Props) {
  const generatedId = useId();
  const [open, setOpen] = useState(false);
  const container = useOverlayContainer();
  const selected =
    value && isValid(parseISO(value)) ? parseISO(value) : undefined;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          id={id ?? generatedId}
          aria-label={label}
          aria-describedby={required ? `${generatedId}-required` : undefined}
          className="zen-date-trigger"
        >
          <span>
            {selected
              ? format(selected, "d MMM yyyy", { locale: es })
              : "Elige una fecha"}
          </span>
          <CalendarDays size={21} />
        </button>
      </Popover.Trigger>
      {required && (
        <span id={`${generatedId}-required`} className="sr-only">
          Fecha obligatoria
        </span>
      )}
      <Popover.Portal container={container}>
        <Popover.Content
          className="zen-date-popover"
          sideOffset={8}
          collisionPadding={12}
          align="start"
          aria-label="Elegir fecha"
        >
          <div className="date-picker-kicker">
            <CalendarDays size={16} />
            UN DÍA PARA TU BIENESTAR
          </div>
          <DayPicker
            mode="single"
            locale={es}
            weekStartsOn={1}
            selected={selected}
            defaultMonth={selected ?? (min ? parseISO(min) : undefined)}
            onSelect={(date) => {
              if (date) {
                onChange(format(date, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
            disabled={[
              ...(min ? [{ before: parseISO(min) }] : []),
              ...(max ? [{ after: parseISO(max) }] : []),
            ]}
            startMonth={min ? parseISO(min) : undefined}
            endMonth={max ? parseISO(max) : undefined}
            showOutsideDays
            fixedWeeks
            autoFocus
            components={{
              Chevron: ({ orientation }) =>
                orientation === "left" ? (
                  <ChevronLeft size={19} />
                ) : (
                  <ChevronRight size={19} />
                ),
            }}
          />
          <div className="date-picker-footer">
            <span>Hora de Perú</span>
            <button
              type="button"
              disabled={Boolean(
                (min && dateKey() < min) || (max && dateKey() > max),
              )}
              onClick={() => {
                onChange(dateKey());
                setOpen(false);
              }}
            >
              Elegir hoy
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
