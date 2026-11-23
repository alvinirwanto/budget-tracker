import { differenceInCalendarDays, parseISO } from "date-fns";
import { formatDate, formatIDR, toISO } from "./format";
import { activeBudget, summarizeBudget } from "./stats";
import type { AppState, Bill } from "./types";

/** Warn when a category (or the whole budget) reaches this share. */
export const WARN_AT = 0.8;

export type NoticeLevel = "danger" | "warn";

export interface Notice {
  /** Stable key. A new level or a new due date makes a new key, so it shows up as unread again. */
  key: string;
  level: NoticeLevel;
  kind: "bill" | "budget";
  title: string;
  body: string;
  href: string;
  /** Lower = more urgent. */
  rank: number;
}

export function daysUntil(dueDate: string, today = new Date()) {
  return differenceInCalendarDays(parseISO(dueDate), parseISO(toISO(today)));
}

export function billStatus(bill: Bill, today = new Date()) {
  const d = daysUntil(bill.dueDate, today);
  if (bill.paid) return { label: "Paid", tone: "done" as const, days: d };
  if (d < 0) return { label: `${-d} day${d === -1 ? "" : "s"} overdue`, tone: "danger" as const, days: d };
  if (d === 0) return { label: "Due today", tone: "warn" as const, days: d };
  if (d <= Math.max(...bill.remindDays, 0)) return { label: `Due in ${d} day${d === 1 ? "" : "s"}`, tone: "warn" as const, days: d };
  return { label: `In ${d} days`, tone: "calm" as const, days: d };
}

export function buildNotices(state: AppState, today = new Date()): Notice[] {
  const out: Notice[] = [];

  for (const b of state.bills) {
    if (b.paid) continue;
    const d = daysUntil(b.dueDate, today);
    const amount = b.amount ? ` · ${formatIDR(b.amount)}` : "";
    const base = `bill:${b.id}:${b.dueDate}`;
    if (d < 0) {
      out.push({
        key: `${base}:overdue`,
        level: "danger",
        kind: "bill",
        title: `${b.name} is overdue`,
        body: `Was due ${formatDate(b.dueDate)} (${-d} day${d === -1 ? "" : "s"} ago)${amount}`,
        href: "/reminders?tab=bills",
        rank: 0,
      });
    } else if (d === 0) {
      out.push({
        key: `${base}:today`,
        level: "warn",
        kind: "bill",
        title: `${b.name} is due today`,
        body: `Pay it today${amount}`,
        href: "/reminders?tab=bills",
        rank: 1,
      });
    } else {
      // The reminder that fired last: the closest selected time that has already started.
      const fired = [...b.remindDays].filter((t) => t >= d).sort((x, y) => x - y)[0];
      if (fired === undefined) continue;
      out.push({
        key: `${base}:r${fired}`,
        level: "warn",
        kind: "bill",
        title: `${b.name} is due in ${d} day${d === 1 ? "" : "s"}`,
        body: `Due ${formatDate(b.dueDate, "EEEE d MMM")}${amount}`,
        href: "/reminders?tab=bills",
        rank: 2 + d / 100,
      });
    }
  }

  const budget = activeBudget(state.budgets, today);
  if (budget) {
    const s = summarizeBudget(budget, state.transactions, today);
    const href = `/budgets/${budget.id}`;

    for (const r of s.rows) {
      const name = state.categories.find((c) => c.id === r.categoryId)?.name ?? "A category";
      const share = r.allocated ? r.spent / r.allocated : 0;
      if (share >= 1) {
        out.push({
          key: `budget:${budget.id}:${r.categoryId}:over`,
          level: "danger",
          kind: "budget",
          title: `${name} is over budget`,
          body: `${formatIDR(r.spent)} spent of ${formatIDR(r.allocated)} — over by ${formatIDR(-r.left)}`,
          href,
          rank: 1.5,
        });
      } else if (share >= WARN_AT) {
        out.push({
          key: `budget:${budget.id}:${r.categoryId}:80`,
          level: "warn",
          kind: "budget",
          title: `${name} is at ${Math.round(share * 100)}% of its budget`,
          body: `${formatIDR(r.left)} left in "${budget.name}"`,
          href,
          rank: 3,
        });
      }
    }

    const total = budget.total ? s.spent / budget.total : 0;
    if (total >= 1) {
      out.push({
        key: `budget:${budget.id}:total:over`,
        level: "danger",
        kind: "budget",
        title: `"${budget.name}" is over budget`,
        body: `You are ${formatIDR(-s.remaining)} over the total of ${formatIDR(budget.total)}`,
        href,
        rank: 1.2,
      });
    } else if (total >= WARN_AT) {
      out.push({
        key: `budget:${budget.id}:total:80`,
        level: "warn",
        kind: "budget",
        title: `"${budget.name}" is at ${Math.round(total * 100)}%`,
        body: `${formatIDR(s.remaining)} left, ${s.daysLeft} day${s.daysLeft === 1 ? "" : "s"} to go`,
        href,
        rank: 2.8,
      });
    }
  }

  return out.sort((a, b) => a.rank - b.rank);
}

export function unreadCount(notices: Notice[], seen: string[]) {
  const set = new Set(seen);
  return notices.filter((n) => !set.has(n.key)).length;
}
