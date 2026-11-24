"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

/** Pill switch on shadcn ToggleGroup. The active pill slides to the chosen option. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const index = options.findIndex((o) => o.value === value);
  const count = options.length;
  const pad = "0.375rem"; // matches p-1.5

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      spacing={0}
      className={cn("relative w-full rounded-full bg-[light-dark(#e3e6ed,#2b3240)] p-1.5", className)}
    >
      {index >= 0 && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute rounded-full bg-primary shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none",
            size === "sm" ? "h-9" : "h-10",
          )}
          style={{
            top: pad,
            left: pad,
            width: `calc((100% - 2 * ${pad}) / ${count})`,
            transform: `translateX(${index * 100}%)`,
          }}
        />
      )}
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className={cn(
            "relative z-10 flex-1 rounded-full bg-transparent px-3 font-semibold text-muted-foreground transition-colors duration-300 hover:bg-transparent data-[state=on]:bg-transparent data-[state=on]:text-primary-foreground",
            size === "sm" ? "h-9 min-h-9 text-[13px]" : "h-10 min-h-10 text-sm",
          )}
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
