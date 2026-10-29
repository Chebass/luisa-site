"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { LoaderCircle } from "lucide-react";
const buttonVariants = cva("button", {
  variants: {
    variant: {
      default: "button-primary",
      outline: "button-outline",
      ghost: "button-ghost",
      destructive: "button-danger",
    },
    size: { default: "", sm: "button-sm", icon: "button-icon" },
  },
  defaultVariants: { variant: "default", size: "default" },
});
export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  const [pending, setPending] = React.useState(false);
  const waiting = loading || pending;
  function click(event: React.MouseEvent<HTMLButtonElement>) {
    const result = (
      props.onClick as
        ((event: React.MouseEvent<HTMLButtonElement>) => unknown) | undefined
    )?.(event);
    if (result && typeof (result as Promise<unknown>).then === "function") {
      setPending(true);
      void Promise.resolve(result).then(
        () => setPending(false),
        () => setPending(false),
      );
    }
  }
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
      onClick={asChild ? props.onClick : click}
      disabled={props.disabled || waiting}
      aria-busy={waiting || undefined}
    >
      {asChild ? (
        children
      ) : (
        <>
          {waiting && (
            <LoaderCircle
              className="button-spinner"
              size={19}
              aria-hidden="true"
            />
          )}
          {children}
        </>
      )}
    </Comp>
  );
}
