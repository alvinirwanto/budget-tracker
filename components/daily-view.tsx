"use client";

import { useMemo, useState } from "react";
import { addDays, eachDayOfInterval, format, parseISO } from "date-fns";
import { CaretLeftIcon, CaretRightIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, EmptyState } from "@/components/page-bits";
import { Amount, TxIcon } from "@/components/transaction-list";
import { useTransactionSheet } from "@/components/app-shell";
import { describeTransaction } from "@/lib/describe";
import { ISO, formatDate, formatIDR, todayISO } from "@/lib/format";
import { periodLabel, periodRange } from "@/lib/stats";
import type { AppState } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Pick a day from the week strip, see what happened on it and the day's total. */
export function DailyView({ state }: { state: AppState }) {
  const openSheet = useTransactionSheet();
  const [selected, setSelected] = useState(() => todayISO());
  const today = todayISO();
  const anchor = parseISO(selected);
  const range = periodRange("week", anchor);
  const days = eachDayOfInterval({ start: parseISO(range.start), end: parseISO(range.end) });

  const busy = useMemo(() => {
    const set = new Set<string>();
    for (const t of state.transactions) set.add(t.date);
    return set;
  }, [state.transactions]);

  const dayTx = state.transactions.filter((t) => t.date === selected);
  const total = dayTx.reduce(
    (sum, t) => sum + (t.type === "income" ? t.amount : t.type === "expense" ? -t.amount : 0),
    0,
  );
  const shift = (weeks: number) => setSelected(format(addDays(anchor, weeks * 7), ISO));

  return (
    <div className="grid gap-5 lg:max-w-3xl">
      <Card className="grid gap-4 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-11 rounded-full bg-muted hover:bg-muted/70"
            onClick={() => shift(-1)}
            aria-label="Previous week"
          >
            <CaretLeftIcon className="size-4" weight="bold" />
          </Button>
          <h2 className="font-bold" aria-live="polite">
            {periodLabel("week", anchor)}
          </h2>
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-11 rounded-full bg-muted hover:bg-muted/70"
            onClick={() => shift(1)}
            aria-label="Next week"
          >
            <CaretRightIcon className="size-4" weight="bold" />
          </Button>
        </div>

        <ToggleGroup
          type="single"
          value={selected}
          onValueChange={(v) => v && setSelected(v)}
          aria-label="Day"
          spacing={0}
          className="grid w-full grid-cols-7"
        >
          {days.map((d) => {
            const iso = format(d, ISO);
            return (
              <ToggleGroupItem
                key={iso}
                value={iso}
                aria-label={format(d, "EEEE d MMMM")}
                className="group/day h-auto flex-col gap-1.5 rounded-xl bg-transparent px-0 py-1 hover:bg-transparent data-[state=on]:bg-transparent"
              >
                <span className="text-xs font-medium text-muted-foreground">{format(d, "EEE")}</span>
                <span
                  className={cn(
                    "relative grid size-10 place-items-center rounded-full bg-muted text-sm font-bold transition-colors group-data-[state=on]/day:bg-primary group-data-[state=on]/day:text-primary-foreground",
                    iso === today && "ring-2 ring-primary/40",
                  )}
                >
                  {format(d, "d")}
                  {busy.has(iso) && (
                    <i
                      aria-hidden
                      className="absolute -bottom-0.5 size-1.5 rounded-full bg-primary group-data-[state=on]/day:bg-primary-foreground"
                    />
                  )}
                </span>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </Card>

      <section aria-labelledby="day-title">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 id="day-title" className="text-lg font-bold">
            {selected === today ? "Today" : formatDate(selected, "EEEE, d MMM")}
          </h2>
          <Button
            variant="outline"
            className="h-10 rounded-full px-4 font-semibold"
            onClick={() => openSheet({ date: selected })}
          >
            <PlusIcon className="size-4" weight="bold" /> Add
          </Button>
        </div>

        {dayTx.length === 0 ? (
          <EmptyState
            title="Nothing on this day"
            body="Tap Add to record what you spent or earned."
          />
        ) : (
          <Card className="px-5 py-1 md:px-6">
            <ul className="divide-y">
              {dayTx.map((t) => {
                const d = describeTransaction(t, state);
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => openSheet({ transaction: t })}
                      className="flex w-full items-center gap-4 py-4 text-left focus-visible:outline-3 focus-visible:outline-ring"
                    >
                      <TxIcon t={t} state={state} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{d.title}</span>
                        <span className="mt-0.5 block truncate text-sm text-muted-foreground">{d.where}</span>
                      </span>
                      <Amount t={t} />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between gap-3 border-t py-4">
              <span className="shrink-0 text-muted-foreground">Total</span>
              <span className={cn("money min-w-0 flex-1 text-right text-lg font-extrabold", total < 0 && "text-expense")}>
                {formatIDR(total)}
              </span>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
