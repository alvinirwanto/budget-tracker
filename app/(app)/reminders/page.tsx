"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BellRingingIcon,
  CalendarCheckIcon,
  CheckIcon,
  CaretRightIcon,
  PlusIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BillForm } from "@/components/bill-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MoneyText } from "@/components/money-text";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/page-bits";
import { Segmented } from "@/components/segmented";
import { Sheet } from "@/components/sheet";
import { formatDate, formatIDR } from "@/lib/format";
import { billStatus, buildNotices, unreadCount, type Notice } from "@/lib/reminders";
import { actions, useAppState } from "@/lib/store";
import type { AppState, Bill } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function RemindersPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Reminders />
    </Suspense>
  );
}

function Reminders() {
  const state = useAppState();
  const params = useSearchParams();
  return state.hydrated ? <View state={state} initialTab={params.get("tab") === "bills" ? "bills" : "alerts"} /> : <Skeleton />;
}

function View({ state, initialTab }: { state: AppState; initialTab: "alerts" | "bills" }) {
  const [tab, setTab] = useState<"alerts" | "bills">(initialTab);
  const notices = useMemo(() => buildNotices(state), [state]);
  const unread = unreadCount(notices, state.seen);
  const seen = new Set(state.seen);

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader
        title="Reminders"
        back="history"
        subtitle="Bills to pay and budgets close to the limit"
        tabs={
          <Segmented
            label="Reminders view"
            value={tab}
            onChange={setTab}
            options={[
              { value: "alerts", label: unread ? `Notifications (${unread})` : "Notifications" },
              { value: "bills", label: "Bills" },
            ]}
          />
        }
      />
      {tab === "alerts" ? (
        <Alerts notices={notices} seen={seen} unread={unread} onBills={() => setTab("bills")} />
      ) : (
        <Bills state={state} />
      )}
    </div>
  );
}

function Alerts({
  notices,
  seen,
  unread,
  onBills,
}: {
  notices: Notice[];
  seen: Set<string>;
  unread: number;
  onBills: () => void;
}) {
  if (notices.length === 0) {
    return (
      <EmptyState
        title="All clear"
        body="Nothing is due soon and no budget is close to its limit."
        action={
          <Button variant="outline" className="h-11 rounded-full px-5" onClick={onBills}>
            Add a bill reminder
          </Button>
        }
      />
    );
  }
  return (
    <section className="grid gap-4" aria-label="Notifications">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {unread ? `${unread} new` : "You have seen everything"}
        </p>
        <Button
          variant="ghost"
          className="h-10 rounded-full px-4 font-semibold text-primary"
          disabled={unread === 0}
          onClick={() => actions.markSeen(notices.map((n) => n.key))}
        >
          <CheckIcon className="size-4" weight="bold" /> Mark all as read
        </Button>
      </div>
      <ul className="grid gap-3">
        {notices.map((n) => {
          const isNew = !seen.has(n.key);
          const Icon = n.level === "danger" ? WarningIcon : BellRingingIcon;
          return (
            <li key={n.key}>
              <Link
                href={n.href}
                onClick={() => actions.markSeen([n.key])}
                className={cn(
                  "flex items-start gap-4 rounded-2xl bg-card p-4 shadow-card transition-colors md:p-5 hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-ring dark:border",
                  isNew && "ring-1 ring-primary/30",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-full",
                    n.level === "danger" ? "bg-expense/12 text-expense" : "bg-amber-400/20 text-amber-700 dark:text-amber-300",
                  )}
                >
                  <Icon className="size-5" weight="fill" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold"><MoneyText>{n.title}</MoneyText></span>
                    {isNew && <i aria-label="New" className="size-2 shrink-0 rounded-full bg-primary" />}
                  </span>
                  <span data-fit="3" className="mt-1.5 block text-sm leading-relaxed text-muted-foreground"><MoneyText>{n.body}</MoneyText></span>
                </span>
                <CaretRightIcon className="mt-3 size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Budget alerts start at 80% of a category, and again when it goes over.
      </p>
    </section>
  );
}

function remindText(days: number[]) {
  const label = (d: number) => (d === 0 ? "on the day" : d === 7 ? "1 week before" : `${d} day${d === 1 ? "" : "s"} before`);
  return [...days].sort((a, b) => b - a).map(label).join(", ");
}

function Bills({ state }: { state: AppState }) {
  const [editing, setEditing] = useState<{ bill?: Bill; n: number } | null>(null);
  const [confirm, setConfirm] = useState(false);

  const sorted = [...state.bills].sort((a, b) =>
    a.paid === b.paid ? (a.dueDate < b.dueDate ? -1 : 1) : a.paid ? 1 : -1,
  );

  return (
    <section className="grid gap-5" aria-label="Bills">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {state.bills.length} bill{state.bills.length === 1 ? "" : "s"}
        </p>
        <Button className="h-11 rounded-full px-5 font-bold" onClick={() => setEditing({ n: Date.now() })}>
          <PlusIcon className="size-4" weight="bold" /> New bill
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          title="No bills yet"
          body="Add a bill with its due date and you get a reminder before it is due."
          action={
            <Button className="h-11 rounded-full px-5" onClick={() => setEditing({ n: Date.now() })}>
              Add a bill
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4">
          {sorted.map((b) => {
            const st = billStatus(b);
            return (
              <li key={b.id}>
                <Card className={cn("grid gap-4 md:p-6", b.paid && "opacity-60")}>
                  <button
                    type="button"
                    onClick={() => setEditing({ bill: b, n: Date.now() })}
                    className="flex items-start gap-4 text-left focus-visible:outline-3 focus-visible:outline-ring"
                    aria-label={`Edit ${b.name}`}
                  >
                    <span
                      aria-hidden
                      className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-primary"
                    >
                      <CalendarCheckIcon className="size-5" weight="duotone" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold">{b.name}</span>
                      <span className="mt-1.5 block text-sm text-muted-foreground">
                        {formatDate(b.dueDate, "EEE, d MMM yyyy")} · {b.repeat === "monthly" ? "every month" : "once"}
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        Reminds {remindText(b.remindDays)}
                      </span>
                      {b.amount ? (
                        <span className="money-lg mt-2 block text-lg font-bold">{formatIDR(b.amount)}</span>
                      ) : null}
                    </span>
                  </button>

                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        st.tone === "danger" && "bg-expense/12 text-expense",
                        st.tone === "warn" && "bg-amber-400/20 text-amber-700 dark:text-amber-300",
                        st.tone === "calm" && "bg-muted text-muted-foreground",
                        st.tone === "done" && "bg-income/15 text-income",
                      )}
                    >
                      {st.label}
                    </span>
                    {!b.paid && (
                      <Button
                        variant="outline"
                        className="h-10 rounded-full px-4 font-semibold"
                        onClick={() => {
                          actions.markBillPaid(b.id);
                          toast.success(b.repeat === "monthly" ? `${b.name} paid. Next one is next month` : `${b.name} marked as paid`);
                        }}
                      >
                        <CheckIcon className="size-4" weight="bold" /> Mark paid
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing?.bill ? `Edit ${editing.bill.name}` : "New bill"}
        description="You get a reminder before the due date."
      >
        {editing && (
          <BillForm
            key={editing.n}
            bill={editing.bill}
            onDone={() => setEditing(null)}
            onDelete={editing.bill ? () => setConfirm(true) : undefined}
          />
        )}
      </Sheet>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${editing?.bill?.name ?? "bill"}?`}
        description="You will not get reminders for it any more."
        confirmLabel="Delete"
        onConfirm={() => {
          if (editing?.bill) actions.deleteBill(editing.bill.id);
          toast.success("Bill deleted");
          setEditing(null);
        }}
      />
    </section>
  );
}
