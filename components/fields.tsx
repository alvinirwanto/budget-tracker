"use client";

import { useId, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatNumber, parseDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Field({
  label,
  error,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Whole-rupiah input: shows 1.250.000, stores the number. Same size and shape as every other field. */
export function MoneyInput({
  value,
  onChange,
  invalid,
  id,
  placeholder = "0",
  className,
  hero,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  invalid?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
  /** Big, bold version for the main amount of a form. */
  hero?: boolean;
}) {
  const auto = useId();
  return (
    <div className="relative">
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted-foreground",
          hero ? "text-xl font-semibold" : "left-3.5 text-base",
        )}
      >
        Rp
      </span>
      <Input
        id={id ?? auto}
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={invalid || undefined}
        placeholder={placeholder}
        value={value ? formatNumber(value) : ""}
        onChange={(e) => {
          const n = parseDigits(e.target.value);
          onChange(n === 0 && e.target.value === "" ? undefined : n);
        }}
        className={cn(
          hero
            ? "money-lg h-16 rounded-2xl border-2 bg-accent/40 pl-14 text-3xl font-bold md:text-3xl focus-visible:border-primary"
            : "pl-11",
          className,
        )}
      />
    </div>
  );
}

