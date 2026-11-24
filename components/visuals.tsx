"use client";

import type { Bucket } from "@/lib/stats";
import { CATEGORY_ICONS, categoryColor } from "@/lib/icons";
import { useCustomIcon } from "@/lib/phosphor";
import type { Category } from "@/lib/types";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CategoryBadge({
  category,
  size = "md",
}: {
  category?: Pick<Category, "icon" | "color">;
  size?: "sm" | "md" | "lg";
}) {
  const name = category?.icon ?? "other";
  const custom = useCustomIcon(name in CATEGORY_ICONS ? undefined : name);
  const Icon = CATEGORY_ICONS[name] ?? custom ?? CATEGORY_ICONS.other;
  const color = categoryColor(category?.color);
  return (
    <span
      aria-hidden
      style={color.style}
      className={cn(
        "grid shrink-0 place-items-center rounded-full",
        color.bg,
        color.fg,
        size === "sm" && "size-8 [&>svg]:size-4",
        size === "md" && "size-11 [&>svg]:size-5",
        size === "lg" && "size-14 [&>svg]:size-7",
      )}
    >
      {/* The icon comes from a cache of already-loaded Phosphor components, so it is stable between renders. */}
      {/* eslint-disable-next-line react-hooks/static-components */}
      <Icon weight="duotone" />
    </span>
  );
}

/** Circular progress. `value` 0..1 (clamped). `over` flips the arc to the expense color. */
export function Ring({
  value,
  size = 56,
  stroke = 6,
  color = "var(--primary)",
  over,
  track = "var(--muted)",
  children,
  label,
  fluid,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  over?: boolean;
  track?: string;
  children?: React.ReactNode;
  label?: string;
  /** CSS length: the ring may shrink to this when the screen is narrow. */
  fluid?: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: fluid ? `min(${size}px, ${fluid})` : size, aspectRatio: "1", height: fluid ? "auto" : size }}
      role="img"
      aria-label={label}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? "var(--expense)" : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="w-[72%] text-center">{children}</div>
      </div>
    </div>
  );
}

export function Progress({
  value,
  over,
  color = "var(--primary)",
  className,
}: {
  value: number;
  over?: boolean;
  color?: string;
  className?: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-muted", className)} aria-hidden>
      <div
        className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
        style={{ width: `${v * 100}%`, background: over ? "var(--expense)" : color }}
      />
    </div>
  );
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/** Income (light lime) and spending (deep green) bars on a shared axis with grid lines. */
export function BarChart({ data, labelEvery = 1 }: { data: Bucket[]; labelEvery?: number }) {
  // Axis follows spending; a big income day is capped at the top so spending stays readable.
  const top = niceMax(Math.max(...data.map((d) => d.expense), 0));
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => top * f);
  const summary = data
    .filter((d) => d.income || d.expense)
    .map((d) => `${d.label}: spent ${formatCompact(d.expense)}, income ${formatCompact(d.income)}`)
    .join("; ");
  const dense = data.length > 12;
  return (
    <figure className="m-0">
      <figcaption className="sr-only">Income and spending chart. {summary || "No data yet."}</figcaption>
      <div className="flex gap-2" aria-hidden>
        <div className="flex h-80 flex-col justify-between pb-0 text-[11px] leading-none text-muted-foreground md:h-[26rem]">
          {ticks.map((t) => (
            <span key={t} className="money -translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {formatCompact(t)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-0 flex flex-col justify-between">
            {ticks.map((t) => (
              <div key={t} className="border-t border-foreground/10" />
            ))}
          </div>
          <div className="relative flex h-80 items-end justify-between gap-[2px] md:h-[26rem] md:gap-1">
            {data.map((d) => (
              <div key={d.key} className="relative flex h-full min-w-0 flex-1 items-end justify-center">
                <div
                  className={cn(
                    "relative flex h-full items-end justify-center",
                    dense ? "w-full" : "w-full max-w-7",
                  )}
                >
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-full bg-income/40 transition-[height] duration-500 motion-reduce:transition-none"
                    style={{ height: `${Math.min(1, d.income / top) * 100}%`, minHeight: d.income ? 6 : 0 }}
                  />
                  <div
                    className="relative w-full rounded-full bg-primary transition-[height] duration-500 motion-reduce:transition-none"
                    style={{ height: `${Math.min(1, d.expense / top) * 100}%`, minHeight: d.expense ? 6 : 0 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 flex gap-2 text-[11px] text-muted-foreground" aria-hidden>
        <span className="invisible">{formatCompact(top)}</span>
        <div className="flex min-w-0 flex-1 justify-between gap-[3px]">
          {data.map((d, i) => (
            <span key={d.key} className="flex min-w-0 flex-1 justify-center whitespace-nowrap">
              {i % labelEvery === 0 ? d.label : ""}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

/** Small ring with a percentage inside and a label under it. */
export function RingStat({
  value,
  label,
  color,
  over,
}: {
  value: number;
  label: string;
  color?: string;
  over?: boolean;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="grid justify-items-center gap-2.5 text-center">
      <Ring size={84} stroke={9} value={value} color={color} over={over} label={`${label} ${pct}% used`}>
        <span className="money text-sm font-bold">{pct}%</span>
      </Ring>
      <span className="max-w-full truncate text-sm text-foreground">{label}</span>
    </div>
  );
}

/** Doughnut cut into slices. Each slice is a share of the whole; the middle stays free for a label. */
export function Donut({
  slices,
  size = 132,
  stroke = 22,
  label,
  children,
}: {
  slices: { value: number; color: string }[];
  size?: number;
  stroke?: number;
  label?: string;
  children?: React.ReactNode;
}) {
  const total = slices.reduce((a, s) => a + Math.max(0, s.value), 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = slices.filter((s) => s.value > 0).length > 1 ? 3 : 0; // small space between slices
  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        {total > 0 &&
          slices.map((s, i) => {
            const len = (Math.max(0, s.value) / total) * c;
            if (len <= 0) return null;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center text-center">{children}</div>}
    </div>
  );
}
