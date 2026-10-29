"use client";
import { useId } from "react";
import { Clock3 } from "lucide-react";
import { Select } from "./select";
export function TimePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const id = useId();
  const [hour = "08", minute = "00"] = value.split(":");
  return (
    <div className="time-picker-field">
      <span id={id} className="field-label">
        {label}
      </span>
      <div className="zen-time-picker" role="group" aria-labelledby={id}>
        <Clock3 size={20} />
        <Select
          value={hour}
          label={`${label}: hora`}
          onValueChange={(h) => onChange(`${h}:${minute}`)}
          options={Array.from({ length: 24 }, (_, i) => ({
            value: String(i).padStart(2, "0"),
            label: String(i).padStart(2, "0"),
          }))}
        />
        <span className="time-colon">:</span>
        <Select
          value={minute}
          label={`${label}: minutos`}
          onValueChange={(m) => onChange(`${hour}:${m}`)}
          options={Array.from({ length: 60 }, (_, i) => ({
            value: String(i).padStart(2, "0"),
            label: String(i).padStart(2, "0"),
          }))}
        />
        <span className="time-period">h</span>
      </div>
    </div>
  );
}
