"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import type { Bucket } from "@/lib/stats";
import { CATEGORY_ICONS, categoryColor } from "@/lib/icons";
import { useCustomIcon } from "@/lib/phosphor";
import type { Category } from "@/lib/types";
import { formatCompact, formatIDR } from "@/lib/format";
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

/**
 * Income (green) and spending (red) bars side by side on a shared axis with grid lines.
 * With `visible`, only that many slots fit on screen at once and the rest scrolls sideways;
 * the number axis stays put. `focus` is the slot to bring into view first.
 */
export function BarChart({
  data,
  labelEvery = 1,
  visible,
  focus = 0,
}: {
  data: Bucket[];
  labelEvery?: number;
  visible?: number;
  focus?: number;
}) {
  // Axis follows spending; a big income day is capped at the top so spending stays readable.
  const top = niceMax(Math.max(...data.map((d) => d.expense), 0));
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => top * f);
  const summary = data
    .filter((d) => d.income || d.expense)
    .map((d) => `${d.label}: spent ${formatCompact(d.expense)}, income ${formatCompact(d.income)}`)
    .join("; ");
  // Tap a slot to see what came in and went out in it.
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const picked = data.find((d) => d.key === pickedKey) ?? null;
  const titleOf = (key: string) =>
    key.length === 7 ? format(parseISO(`${key}-01`), "MMMM yyyy") : format(parseISO(key), "EEEE, d MMM yyyy");
  const scrolls = !!visible && data.length > visible;
  const dense = !scrolls && data.length > 12;
  const every = scrolls ? 1 : labelEvery;

  // Start with the focused slot near the right edge of the window.
  const scroller = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !scrolls) return;
    const slot = el.scrollWidth / data.length;
    el.scrollLeft = Math.max(0, (focus + 1) * slot - el.clientWidth + slot);
  }, [scrolls, data.length, focus]);

  return (
    <figure className="m-0">
      <figcaption className="sr-only">Income and spending chart. {summary || "No data yet."}</figcaption>
      <div className="flex gap-2">
        <div aria-hidden className="shrink-0 text-[11px] leading-none text-muted-foreground">
          <div className="flex h-80 flex-col justify-between md:h-[26rem]">
            {ticks.map((t) => (
              <span key={t} className="money -translate-y-1/2 first:translate-y-0 last:translate-y-0">
                {formatCompact(t)}
              </span>
            ))}
          </div>
          <span className="invisible mt-2 block">0</span>
        </div>
        <div
          ref={scroller}
          className={cn("min-w-0 flex-1", scrolls && "overflow-x-auto overscroll-x-contain [scrollbar-width:none]")}
        >
          <div style={scrolls ? { width: `${(data.length / visible!) * 100}%` } : undefined}>
            <div className="relative">
              <div className="absolute inset-0 flex flex-col justify-between">
                {ticks.map((t) => (
                  <div key={t} className="border-t border-foreground/10" />
                ))}
              </div>
              <div
                className={cn(
                  "relative flex h-80 items-end justify-between md:h-[26rem]",
                  scrolls ? "gap-0" : "gap-[2px] md:gap-1",
                )}
              >
                {data.map((d) => (
                  <button
                    type="button"
                    key={d.key}
                    onClick={() => setPickedKey((k) => (k === d.key ? null : d.key))}
                    aria-pressed={picked?.key === d.key}
                    aria-label={`${titleOf(d.key)}: income ${formatIDR(d.income)}, expense ${formatIDR(d.expense)}`}
                    className={cn(
                      "relative flex h-full min-w-0 flex-1 items-end justify-center rounded-none transition-colors focus-visible:outline-3 focus-visible:outline-ring",
                      picked?.key === d.key && "bg-foreground/[0.06]",
                    )}
                  >
                    {/* Income and spending side by side. */}
                    <div
                      className={cn(
                        "relative flex h-full items-end justify-center gap-[2px]",
                        dense ? "w-full" : scrolls ? "w-[68%] max-w-10" : "w-full max-w-9",
                      )}
                    >
                      <div
                        className="min-w-0 flex-1 rounded-full bg-income transition-[height] duration-500 motion-reduce:transition-none"
                        style={{ height: `${Math.min(1, d.income / top) * 100}%`, minHeight: d.income ? 6 : 0 }}
                      />
                      <div
                        className="min-w-0 flex-1 rounded-full bg-expense transition-[height] duration-500 motion-reduce:transition-none"
                        style={{ height: `${Math.min(1, d.expense / top) * 100}%`, minHeight: d.expense ? 6 : 0 }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div aria-hidden className="mt-2 flex text-[11px] leading-none text-muted-foreground">
              {data.map((d, i) => (
                <span key={d.key} className="flex min-w-0 flex-1 justify-center whitespace-nowrap">
                  {i % every === 0 ? d.label : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div role="status" aria-live="polite" className="mt-4">
        {picked ? (
          <div className="grid gap-2 rounded-lg bg-muted p-3.5">
            <p className="text-sm font-semibold">{titleOf(picked.key)}</p>
            <div className="flex items-center gap-2 text-sm">
              <i aria-hidden className="size-2.5 shrink-0 rounded-full bg-income" />
              <span className="text-muted-foreground">Income</span>
              <span className="money ml-auto font-bold text-income">{formatIDR(picked.income)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <i aria-hidden className="size-2.5 shrink-0 rounded-full bg-expense" />
              <span className="text-muted-foreground">Expense</span>
              <span className="money ml-auto font-bold text-expense">{formatIDR(picked.expense)}</span>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">Tap a bar to see the details</p>
        )}
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
