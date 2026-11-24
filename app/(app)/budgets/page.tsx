"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BudgetForm } from "@/components/budget-form";
import { EmptyState, PageHeader, Skeleton } from "@/components/page-bits";
import { Sheet } from "@/components/sheet";
import { MoneyText } from "@/components/money-text";
import { Progress } from "@/components/visuals";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { actions, useAppState } from "@/lib/store";
import type { Budget } from "@/lib/types";
import { summarizeBudget } from "@/lib/stats";
import { formatDate, formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_LABEL = { active: "Running", upcoming: "Starts soon", ended: "Ended" } as const;

export default function BudgetsPage() {
  const state = useAppState();
  const router = useRouter();
  const [creating, setCreating] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Budget | null>(null);

  if (!state.hydrated) return <Skeleton />;

  const items = state.budgets
    .map((b) => ({ b, s: summarizeBudget(b, state.transactions) }))
    .sort((x, y) => (x.b.startDate < y.b.startDate ? 1 : -1));
  const order = { active: 0, upcoming: 1, ended: 2 } as const;
  items.sort((x, y) => order[x.s.status] - order[y.s.status]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Budgets"
        subtitle="Plan a date range, then split it"
        action={
          <Button className="h-11 rounded-full px-4 font-bold" onClick={() => setCreating(Date.now())}>
            <PlusIcon className="size-4" weight="bold" /> New
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="No budgets yet"
          body="Pick a start and end date, set the amount, then split it into food, gas and the rest."
          action={<Button className="h-11 rounded-full px-5" onClick={() => setCreating(Date.now())}>Create a budget</Button>}
        />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map(({ b, s }) => {
            const over = s.remaining < 0;
            const used = b.total > 0 ? Math.round((s.spent / b.total) * 100) : 0;
            return (
              <li key={b.id} className="relative">
                <Link
                  href={`/budgets/${b.id}`}
                  className={cn(
                    "block rounded-2xl bg-card p-6 shadow-card transition-colors hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-ring dark:border",
                    s.status === "ended" && "opacity-75",
                  )}
                >
                  <p className="truncate pr-12 text-xl font-bold">{b.name}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                    <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                      {STATUS_LABEL[s.status]}
                    </span>
                    <span>
                      {formatDate(b.startDate, "d MMM")} – {formatDate(b.endDate, "d MMM yyyy")}
                    </span>
                  </div>

                  <div className="mt-7">
                    <p className={cn("money-lg text-4xl font-bold", over && "text-expense")}>
                      {formatIDR(s.remaining)}
                    </p>
                    <p data-fit className="mt-2 text-sm text-muted-foreground">
                      <MoneyText>
                        {`${over ? "over" : "left"} of ${formatIDR(b.total)}${s.status === "active" ? ` · ${s.daysLeft} day${s.daysLeft === 1 ? "" : "s"} left` : ""}`}
                      </MoneyText>
                    </p>
                  </div>

                  <div className="mt-7 grid gap-3">
                    <Progress value={s.spent / b.total} over={over} className="h-3" />
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span data-fit className="min-w-0 flex-1 text-muted-foreground">
                        <span className="money font-semibold text-foreground">{formatIDR(s.spent)}</span> spent
                      </span>
                      <span className={cn("money shrink-0 font-bold", over && "text-expense")}>{used}%</span>
                    </div>
                  </div>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  className="absolute top-4 right-4 size-11 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleting(b)}
                  aria-label={`Delete ${b.name}`}
                >
                  <TrashIcon className="size-5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "budget"}?`}
        description="Your transactions are not affected. Only this budget and its split are removed."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleting) actions.deleteBudget(deleting.id);
          toast.success("Budget deleted");
          setDeleting(null);
        }}
      />

      <Sheet
        open={creating !== null}
        onOpenChange={(o) => !o && setCreating(null)}
        title="New budget"
        description="Set a date range and an amount, then split it by category."
      >
        {creating !== null && (
          <BudgetForm
            key={creating}
            onDone={(id) => {
              setCreating(null);
              router.push(`/budgets/${id}`);
            }}
          />
        )}
      </Sheet>
    </div>
  );
}
