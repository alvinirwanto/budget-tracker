"use client";

import { useId, useRef, useState } from "react";
import { formatCompact, formatIDR } from "@/lib/format";

export interface LinePoint {
  label: string;
  value: number;
}

const W = 320;
const H = 150;
const PAD_T = 14;
const PAD_B = 10;

/** Smooth curve that never overshoots the data (monotone cubic, like d3.curveMonotoneX). */
function smooth(pts: [number, number][]): string {
  const n = pts.length;
  if (n < 2) return "";
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    m.push((pts[i + 1][1] - pts[i][1]) / (dx[i] || 1));
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  }
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const h = Math.hypot(a, b);
    if (h > 3) {
      t[i] = (3 * a * m[i]) / h;
      t[i + 1] = (3 * b * m[i]) / h;
    }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const k = dx[i] / 3;
    d += ` C${pts[i][0] + k},${pts[i][1] + t[i] * k} ${pts[i + 1][0] - k},${pts[i + 1][1] - t[i + 1] * k} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

/** Main line (pink) with an optional faint comparison line. Touch or hover to read a day. */
export function LineChart({
  data,
  compare,
  activeIndex,
  onActiveChange,
  title,
}: {
  data: LinePoint[];
  compare?: number[];
  activeIndex: number;
  onActiveChange: (i: number) => void;
  title: string;
}) {
  const id = useId();
  const ref = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);

  const all = [...data.map((d) => d.value), ...(compare ?? []), 0];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = hi - lo || 1;
  const x = (i: number) => (data.length <= 1 ? W / 2 : (i / (data.length - 1)) * W);
  const y = (v: number) => PAD_T + (1 - (v - lo) / span) * (H - PAD_T - PAD_B);

  const main = data.map((d, i) => [x(i), y(d.value)] as [number, number]);
  const cmp = compare?.map((v, i) => [x(i), y(v)] as [number, number]);
  const line = smooth(main);
  const area = `${line} L${W},${H} L0,${H} Z`;
  const active = data[Math.min(activeIndex, data.length - 1)];
  const ax = x(Math.min(activeIndex, data.length - 1));
  const ay = y(active?.value ?? 0);

  function pick(e: React.PointerEvent) {
    const box = ref.current?.getBoundingClientRect();
    if (!box || data.length === 0) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    onActiveChange(Math.round(ratio * (data.length - 1)));
  }

  const tipLeft = Math.min(Math.max((ax / W) * 100, 12), 88);
  const ticks = [hi, lo + span / 2, lo];

  return (
    <div className="relative">
      <div className="flex gap-3">
        <div
          aria-hidden
          className="flex h-[150px] flex-col justify-between text-[11px] leading-none text-muted-foreground"
        >
          {ticks.map((t, i) => (
            <span key={i} className="money">
              {formatCompact(Math.round(t))}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <svg
            ref={ref}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`${title}. ${active ? `${active.label}: ${formatIDR(active.value)}` : "No data"}`}
            className="block h-[150px] w-full touch-pan-y"
            onPointerDown={(e) => {
              setDragging(true);
              pick(e);
            }}
            onPointerMove={(e) => (dragging || e.pointerType === "mouse") && pick(e)}
            onPointerUp={() => setDragging(false)}
            onPointerLeave={() => setDragging(false)}
          >
            <defs>
              <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {lo < 0 && hi > 0 && (
              <line
                x1="0"
                x2={W}
                y1={y(0)}
                y2={y(0)}
                stroke="var(--border)"
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {cmp && (
              <path
                d={smooth(cmp)}
                fill="none"
                stroke="var(--muted-foreground)"
                strokeOpacity="0.28"
                strokeWidth="2.5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
            <path d={area} fill={`url(#${id})`} />
            <path
              d={line}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="3"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {active && (
              <line
                x1={ax}
                x2={ax}
                y1="0"
                y2={H}
                stroke="var(--foreground)"
                strokeOpacity="0.08"
                strokeWidth="10"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          {active && (
            <>
              <span
                aria-hidden
                className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary"
                style={{ left: `${(ax / W) * 100}%`, top: `${(ay / H) * 100}%` }}
              />
              <span
                aria-hidden
                className="money pointer-events-none absolute -translate-x-1/2 -translate-y-[170%] rounded-md bg-foreground px-2 py-1 text-[11px] font-bold whitespace-nowrap text-background"
                style={{ left: `${tipLeft}%`, top: `${(ay / H) * 100}%` }}
              >
                {formatCompact(active.value)}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
