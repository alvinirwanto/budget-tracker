"use client";

import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { MoneyText } from "@/components/money-text";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";
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
          <MoneyText>{error}</MoneyText>
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
  const ref = useRef<HTMLInputElement>(null);
  // How many digits sit left of the caret. Re-formatting adds dots, so the caret is put back by digit count.
  const digitsBeforeCaret = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const n = digitsBeforeCaret.current;
    if (!el || n === null) return;
    digitsBeforeCaret.current = null;
    let pos = 0;
    let seen = 0;
    while (pos < el.value.length && seen < n) if (/\d/.test(el.value[pos++])) seen++;
    if (document.activeElement === el) el.setSelectionRange(pos, pos);
  });
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
        ref={ref}
        id={id ?? auto}
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint="done"
        autoComplete="off"
        aria-invalid={invalid || undefined}
        placeholder={placeholder}
        value={value ? formatNumber(value) : ""}
        onChange={(e) => {
          const el = e.target;
          const before = value ? String(value) : "";
          let digits = el.value.replace(/\D/g, "");
          let caret = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, "").length;
          // Backspace on a dot changes no digit. Remove the digit before the dot instead, so it never gets stuck.
          if (digits === before && el.value.length < (value ? formatNumber(value).length : 0) && caret > 0) {
            digits = digits.slice(0, caret - 1) + digits.slice(caret);
            caret -= 1;
          }
          digitsBeforeCaret.current = caret;
          // Empty is 0 (never undefined): the form would put its default value back and the deleted number would reappear.
          onChange(digits ? Number(digits) : 0);
        }}
        className={cn(
          "money",
          hero
            ? "money-lg h-14 rounded-2xl border-2 bg-accent/40 pl-12 text-2xl font-bold md:h-16 md:pl-14 md:text-3xl focus-visible:border-primary"
            : "pl-11",
          className,
        )}
      />
    </div>
  );
}

