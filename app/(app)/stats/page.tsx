"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addMonths, format, parseISO, setMonth, setYear } from "date-fns";
import { ArrowDownLeftIcon, ArrowUpRightIcon } from "@phosphor-icons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, PageHeader, Skeleton } from "@/components/page-bits";
import { LineChart } from "@/components/line-chart";
import { CategoryBadge, Progress } from "@/components/visuals";
import { categoryColor } from "@/lib/icons";
import { formatDate, formatIDR } from "@/lib/format";
import { monthSeries, periodRange, spendByCategory, totals } from "@/lib/stats";
import { useAppState } from "@/lib/store";
import type { AppState } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function StatsPage() {
  const state = useAppState();
  return state.hydrated ? <StatsView state={state} /> : <Skeleton />;
}

function StatsView({ state }: { state: AppState }) {
  const [anchor, setAnchor] = useState(() => new Date());
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const [pick, setPick] = useState<number | null>(null);
  const chipsRef = useRef<HTMLDivElement>(null);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const first = state.transactions.reduce(
      (min, t) => Math.min(min, parseISO(t.date).getFullYear()),
      now,
    );
    return Array.from({ length: now - first + 1 }, (_, i) => now - i);
  }, [state.transactions]);

  const series = useMemo(() => monthSeries(anchor, state.transactions), [anchor, state.transactions]);
  const prevSeries = useMemo(
    () => monthSeries(addMonths(anchor, -1), state.transactions),
    [anchor, state.transactions],
  );
  const range = periodRange("month", anchor);
  const sum = totals(state.transactions, range);
  const byCat = useMemo(
    () => [...spendByCategory(state.transactions, range).entries()].sort((a, b) => b[1] - a[1]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.transactions, range.start, range.end],
  );

  const today = new Date();
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;
  const defaultIndex = isThisMonth ? today.getDate() - 1 : series.length - 1;
  const active = Math.min(pick ?? defaultIndex, series.length - 1);
  const net = sum.income - sum.expense;

  useEffect(() => {
    // Slide only the month strip. scrollIntoView would also scroll the whole page.
    const box = chipsRef.current;
    const chip = box?.querySelector<HTMLElement>('[data-state="on"]');
    if (box && chip) box.scrollLeft = chip.offsetLeft - (box.clientWidth - chip.offsetWidth) / 2;
  }, [month, year]);

  const points = series.map((p) => ({ label: formatDate(p.date, "d MMM"), value: p.net }));
  const tickEvery = series.length > 28 ? 10 : 7;

  return (
    <div className="grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader
        title="Statistics"
        subtitle="How your month is going"
        tabs={
  <div ref={chipsRef} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
    <ToggleGroup
      type="single"
      value={String(month)}
      onValueChange={(v) => {
        if (!v) return;
        setAnchor((a) => setMonth(a, Number(v)));
        setPick(null);
      }}
      aria-label="Month"
      spacing={2}
      className="w-max"
    >
      {Array.from({ length: 12 }, (_, i) => (
        <ToggleGroupItem
          key={i}
          value={String(i)}
          className="h-11 min-w-14 rounded-full bg-card px-3 text-sm font-semibold shadow-xs hover:bg-card data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {format(setMonth(new Date(2000, 0, 1), i), "MMM")}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  </div>
        }
        action={
          <Select
            value={String(year)}
            onValueChange={(v) => {
              setAnchor((a) => setYear(a, Number(v)));
              setPick(null);
            }}
          >
            <SelectTrigger className="w-28 rounded-full" size="sm" aria-label="Year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Card className="grid gap-5 md:p-6">
        <div>
          <p className="text-sm text-muted-foreground">Net balance</p>
          <p className={cn("money-lg mt-1.5 text-5xl font-bold", net < 0 && "text-expense")}>
            {formatIDR(net)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {format(anchor, "MMMM yyyy")} · faint line is {format(addMonths(anchor, -1), "MMMM")}
          </p>
        </div>
        <LineChart
          title={`Net balance in ${format(anchor, "MMMM yyyy")}`}
          data={points}
          compare={prevSeries.slice(0, series.length).map((p) => p.net)}
          activeIndex={active}
          onActiveChange={setPick}
        />
        <div aria-hidden className="ml-[calc(2.5rem+0.75rem)] flex justify-between text-[11px] text-muted-foreground">
          {series
            .filter((p) => p.day === 1 || p.day % tickEvery === 1 || p.day === series.length)
            .map((p) => (
              <span key={p.day}>{p.day}</span>
            ))}
        </div>
        <p data-fit className="text-sm text-muted-foreground" aria-live="polite">
          {formatDate(series[active].date, "EEEE d MMM")}: spent{" "}
          <span className="money font-semibold text-foreground">{formatIDR(series[active].expense)}</span>, earned{" "}
          <span className="money font-semibold text-income">{formatIDR(series[active].income)}</span>
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="grid gap-5">
          <span aria-hidden className="grid size-11 place-items-center rounded-full bg-income text-white">
            <ArrowDownLeftIcon className="size-5" weight="bold" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Income</p>
            <p className="money mt-1 text-xl font-extrabold text-income">{formatIDR(sum.income)}</p>
          </div>
        </Card>
        <Card className="grid gap-5">
          <span aria-hidden className="grid size-11 place-items-center rounded-full bg-red-500 text-white">
            <ArrowUpRightIcon className="size-5" weight="bold" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Expense</p>
            <p className="money mt-1 text-xl font-extrabold">{formatIDR(sum.expense)}</p>
          </div>
        </Card>
      </div>

      <Card className="md:p-6">
        <h2 className="mb-4 font-bold">Where it went</h2>
        {byCat.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nothing spent this month.</p>
        ) : (
          <ul className="grid gap-4">
            {byCat.map(([id, amount]) => {
              const cat = state.categories.find((c) => c.id === id);
              const share = sum.expense ? amount / sum.expense : 0;
              return (
                <li key={id} className="flex items-center gap-3">
                  <CategoryBadge category={cat} size="sm" />
                  <div className="grid min-w-0 flex-1 gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-semibold">{cat?.name ?? "Uncategorized"}</span>
                      <span className="money max-w-[60%] shrink-0 text-sm font-bold">{formatIDR(amount)}</span>
                    </div>
                    <Progress value={share} color={categoryColor(cat?.color).solid} />
                  </div>
                  <span className="w-9 text-right text-xs text-muted-foreground">{Math.round(share * 100)}%</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
