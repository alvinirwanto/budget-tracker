"use client";

import { ArrowsLeftRightIcon, ArrowDownLeftIcon } from "@phosphor-icons/react";
import { describeTransaction } from "@/lib/describe";
import { formatDate, formatIDR } from "@/lib/format";
import type { AppState, Transaction } from "@/lib/types";
import { CategoryBadge } from "@/components/visuals";
import { cn } from "@/lib/utils";

export function TxIcon({ t, state }: { t: Transaction; state: AppState }) {
  const { category } = describeTransaction(t, state);
  if (t.type === "transfer")
    return (
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-300">
        <ArrowsLeftRightIcon className="size-5" weight="duotone" />
      </span>
    );
  if (t.type === "income")
    return (
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-income/15 text-income">
        <ArrowDownLeftIcon className="size-5" weight="bold" />
      </span>
    );
  return <CategoryBadge category={category ?? { icon: "other", color: "slate" }} />;
}

export function Amount({ t, className }: { t: Transaction; className?: string }) {
  const sign = t.type === "expense" ? "-" : t.type === "income" ? "+" : "";
  return (
    <span
      className={cn(
        "money max-w-[55%] whitespace-nowrap font-bold",
        t.type === "income" && "text-income",
        t.type === "expense" && "text-expense",
        t.type === "transfer" && "text-muted-foreground",
        className,
      )}
    >
      {sign}
      {formatIDR(t.amount)}
    </span>
  );
}

/** Compact list used on the dashboard. */
export function TransactionList({
  items,
  state,
  onSelect,
}: {
  items: Transaction[];
  state: AppState;
  onSelect: (t: Transaction) => void;
}) {
  return (
    <ul className="divide-y">
      {items.map((t) => {
        const d = describeTransaction(t, state);
        return (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onSelect(t)}
              className="flex w-full items-center gap-4 py-4 text-left focus-visible:outline-3 focus-visible:outline-ring"
            >
              <TxIcon t={t} state={state} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{d.title}</span>
                <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                  {d.where} · {formatDate(t.date, "d MMM")}
                </span>
              </span>
              <Amount t={t} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
