"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarBlankIcon, CaretRightIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BudgetForm } from "@/components/budget-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, EmptyState, PageHeader, SectionTitle, Skeleton } from "@/components/page-bits";
import { Sheet } from "@/components/sheet";
import { CategoryBadge, Progress, Ring, RingStat } from "@/components/visuals";
import { useTransactionSheet } from "@/components/app-shell";
import { CATEGORY_COLORS } from "@/lib/icons";
import { actions, useAppState } from "@/lib/store";
import { summarizeBudget } from "@/lib/stats";
import { formatDate, formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function BudgetDetail({ params }: PageProps<"/budgets/[id]">) {
  const { id } = use(params);
  const state = useAppState();
  const router = useRouter();
  const openSheet = useTransactionSheet();
  const [editing, setEditing] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);

  if (!state.hydrated) return <Skeleton />;
  const budget = state.budgets.find((b) => b.id === id);
  if (!budget) {
    return (
      <div className="grid gap-5">
        <PageHeader title="Budget" back="/budgets" />
        <EmptyState title="Budget not found" body="It may have been deleted." />
      </div>
    );
  }

  const s = summarizeBudget(budget, state.transactions);
  const over = s.remaining < 0;
  const pct = Math.round((s.spent / budget.total) * 100);
  const perDay = s.daysLeft > 0 && s.remaining > 0 ? Math.floor(s.remaining / s.daysLeft) : 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-12 lg:items-start">
      <div className="lg:col-span-12">
      <PageHeader
        title={budget.name}
        back="/budgets"
        subtitle={`${s.days} days`}
        action={
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-11 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirm(true)}
            aria-label="Delete budget"
          >
            <TrashIcon className="size-5" />
          </Button>
        }
      />
      </div>

      <section
        aria-labelledby="remaining-title"
        className="grid justify-items-center gap-7 py-2 text-center lg:col-span-5 lg:sticky lg:top-8"
      >
        <p className="flex items-center gap-2 rounded-full bg-muted px-5 py-3 text-sm font-semibold">
          <CalendarBlankIcon className="size-4" />
          {formatDate(budget.startDate, "d MMM")} – {formatDate(budget.endDate, "d MMM yyyy")}
        </p>
        <div className="flex w-full items-center justify-between gap-2">
          <Button
            variant="outline"
            size="icon-lg"
            className="size-11 rounded-full bg-card shadow-xs"
            onClick={() => setEditing(Date.now())}
            aria-label="Edit budget"
          >
            <PencilSimpleIcon className="size-5" />
          </Button>
          <Ring
            size={236}
            stroke={26}
            value={s.remaining / budget.total}
            over={over}
            track="var(--muted)"
            label={`${formatIDR(s.remaining)} remaining`}
          >
            <div>
              <p id="remaining-title" className="text-sm font-medium text-muted-foreground">
                {over ? "Over budget" : "Remaining"}
              </p>
              <p className={cn("money text-3xl font-extrabold", over && "text-expense")}>
                {formatIDR(s.remaining)}
              </p>
            </div>
          </Ring>
          <Button
            variant="outline"
            size="icon-lg"
            className="size-11 rounded-full bg-card shadow-xs"
            onClick={() => openSheet({ type: "expense" })}
            aria-label="Add expense"
          >
            <PlusIcon className="size-5" />
          </Button>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {formatIDR(s.spent)} spent of {formatIDR(budget.total)} ({pct}%)
          <br />
          {s.status === "active" &&
            `${s.daysLeft} day${s.daysLeft === 1 ? "" : "s"} left${perDay ? ` · about ${formatIDR(perDay)} a day` : ""}`}
          {s.status === "upcoming" && "Starts " + formatDate(budget.startDate)}
          {s.status === "ended" && "This budget has ended"}
        </p>
        {s.rows.length > 0 && (
          <ul className="grid w-full grid-cols-3 gap-x-3 gap-y-6 pt-2">
            {s.rows.map((r) => {
              const cat = state.categories.find((c) => c.id === r.categoryId);
              return (
                <li key={r.categoryId}>
                  <RingStat
                    label={cat?.name ?? "Deleted"}
                    value={r.allocated ? r.spent / r.allocated : 0}
                    over={r.left < 0}
                    color={CATEGORY_COLORS[cat?.color ?? "slate"]?.solid}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="split-title" className="lg:col-span-7 lg:col-start-6">
        <SectionTitle
          id="split-title"
          action={
            <Link href="/categories" className="flex min-h-11 items-center gap-1 text-sm font-semibold text-primary">
              Categories <CaretRightIcon className="size-4" />
            </Link>
          }
        >
          Details
        </SectionTitle>
        <Card className="px-5 py-3 md:px-7">
          {s.rows.length === 0 ? (
            <p className="py-8 text-center text-sm leading-relaxed text-muted-foreground">
              No split yet. Edit the budget to divide it by category.
            </p>
          ) : (
            <ul className="divide-y">
              {s.rows.map((r) => {
                const cat = state.categories.find((c) => c.id === r.categoryId);
                const rowOver = r.left < 0;
                return (
                  <li key={r.categoryId} className="py-6">
                    <div className="flex items-center gap-4">
                      <CategoryBadge category={cat} size="md" />
                      <p className="min-w-0 flex-1 truncate text-base font-semibold">
                        {cat?.name ?? "Deleted category"}
                      </p>
                      <p
                        className={cn(
                          "money-lg text-right text-lg font-bold whitespace-nowrap",
                          rowOver ? "text-expense" : "text-foreground",
                        )}
                      >
                        {formatIDR(r.left)}
                        <span className="mt-1 block text-sm font-medium text-muted-foreground">
                          {rowOver ? "over" : "left"}
                        </span>
                      </p>
                    </div>
                    <Progress
                      className="mt-5 h-2.5"
                      value={r.allocated ? r.spent / r.allocated : 0}
                      over={rowOver}
                      color={CATEGORY_COLORS[cat?.color ?? "slate"]?.solid}
                    />
                    <p className="money mt-3 text-sm text-muted-foreground">
                      {formatIDR(r.spent)} spent of {formatIDR(r.allocated)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>

      <Card className="grid gap-2 text-sm lg:col-span-7 lg:col-start-6">
        <Line label="Total budget" value={formatIDR(budget.total)} />
        <Line label="Planned in categories" value={formatIDR(s.allocated)} />
        <Line
          label={s.unallocated < 0 ? "Planned over the budget" : "Not planned yet"}
          value={formatIDR(s.unallocated)}
          bad={s.unallocated < 0}
        />
        {s.unplanned > 0 && <Line label="Spent outside the split" value={formatIDR(s.unplanned)} />}
      </Card>

      <Sheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Edit budget"
        description="Change the dates, amount or split."
      >
        {editing !== null && (
          <BudgetForm
            key={editing}
            budget={budget}
            onDone={() => setEditing(null)}
            onDelete={() => setConfirm(true)}
          />
        )}
      </Sheet>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this budget?"
        description="Your transactions are not affected."
        confirmLabel="Delete"
        onConfirm={() => {
          actions.deleteBudget(budget.id);
          toast.success("Budget deleted");
          router.replace("/budgets");
        }}
      />
    </div>
  );
}

function Line({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("money font-bold", bad && "text-expense")}>{value}</span>
    </div>
  );
}
