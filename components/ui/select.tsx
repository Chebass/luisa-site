"use client";
import * as Primitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useOverlayContainer } from "./overlay-container";
import { cn } from "@/lib/utils";
export type SelectOption = { value: string; label: string; disabled?: boolean };
export function Select({
  value,
  onValueChange,
  options,
  id,
  label,
  placeholder = "Elige una opción",
  className,
  disabled = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  id?: string;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const container = useOverlayContainer();
  return (
    <Primitive.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <Primitive.Trigger
        id={id}
        aria-label={label}
        className={cn("zen-select-trigger", className)}
      >
        <Primitive.Value placeholder={placeholder} />
        <Primitive.Icon>
          <ChevronDown size={18} />
        </Primitive.Icon>
      </Primitive.Trigger>
      <Primitive.Portal container={container}>
        <Primitive.Content
          position="popper"
          sideOffset={7}
          collisionPadding={12}
          className="zen-select-content"
        >
          <Primitive.ScrollUpButton className="zen-select-scroll">
            <ChevronUp size={18} />
          </Primitive.ScrollUpButton>
          <Primitive.Viewport className="zen-select-viewport">
            {options.map((option) => (
              <Primitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="zen-select-item"
              >
                <Primitive.ItemText>{option.label}</Primitive.ItemText>
                <Primitive.ItemIndicator>
                  <Check size={17} />
                </Primitive.ItemIndicator>
              </Primitive.Item>
            ))}
          </Primitive.Viewport>
          <Primitive.ScrollDownButton className="zen-select-scroll">
            <ChevronDown size={18} />
          </Primitive.ScrollDownButton>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
