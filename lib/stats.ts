import {
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { ISO, toISO } from "./format";
import type { AppState, Budget, Pocket, Transaction } from "./types";

export type Period = "week" | "month" | "year";

export interface Range {
  start: string;
  end: string;
}

export function periodRange(period: Period, anchor: Date): Range {
  const opts = { weekStartsOn: 1 as const };
  if (period === "week") {
    return { start: toISO(startOfWeek(anchor, opts)), end: toISO(endOfWeek(anchor, opts)) };
  }
  if (period === "month") {
    return { start: toISO(startOfMonth(anchor)), end: toISO(endOfMonth(anchor)) };
  }
  return { start: toISO(startOfYear(anchor)), end: toISO(endOfYear(anchor)) };
}

export function shiftPeriod(period: Period, anchor: Date, steps: number): Date {
  if (period === "week") return addWeeks(anchor, steps);
  if (period === "month") return addMonths(anchor, steps);
  return addYears(anchor, steps);
}

export function periodLabel(period: Period, anchor: Date): string {
  if (period === "month") return format(anchor, "MMMM yyyy");
  if (period === "year") return format(anchor, "yyyy");
  const r = periodRange("week", anchor);
  const s = parseISO(r.start);
  const e = parseISO(r.end);
  return s.getMonth() === e.getMonth()
    ? `${format(s, "d")} – ${format(e, "d MMM yyyy")}`
    : `${format(s, "d MMM")} – ${format(e, "d MMM yyyy")}`;
}

export const inRange = (iso: string, r: Range) => iso >= r.start && iso <= r.end;

export function pocketBalances(state: AppState): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of state.pockets) map.set(p.id, p.openingBalance);
  for (const t of state.transactions) {
    const from = map.get(t.pocketId);
    if (t.type === "income" && from !== undefined) map.set(t.pocketId, from + t.amount);
    if (t.type === "expense" && from !== undefined) map.set(t.pocketId, from - t.amount);
    if (t.type === "transfer") {
      if (from !== undefined) map.set(t.pocketId, from - t.amount);
      if (t.toPocketId) {
        const to = map.get(t.toPocketId);
        if (to !== undefined) map.set(t.toPocketId, to + t.amount);
      }
    }
  }
  return map;
}

export function balanceOf(
  pocket: Pocket,
  transactions: Transaction[],
  ignoreTransactionId?: string,
): number {
  let b = pocket.openingBalance;
  for (const t of transactions) {
    if (t.id === ignoreTransactionId) continue;
    if (t.pocketId === pocket.id) {
      if (t.type === "income") b += t.amount;
      else b -= t.amount;
    }
    if (t.type === "transfer" && t.toPocketId === pocket.id) b += t.amount;
  }
  return b;
}

export interface Bucket {
  key: string;
  label: string;
  income: number;
  expense: number;
}

export function buckets(period: Period, anchor: Date, txs: Transaction[]): Bucket[] {
  const r = periodRange(period, anchor);
  const interval = { start: parseISO(r.start), end: parseISO(r.end) };
  const map = new Map<string, Bucket>();
  if (period === "year") {
    for (const m of eachMonthOfInterval(interval)) {
      const key = format(m, "yyyy-MM");
      map.set(key, { key, label: format(m, "MMM"), income: 0, expense: 0 });
    }
  } else {
    for (const day of eachDayOfInterval(interval)) {
      const key = format(day, ISO);
      map.set(key, {
        key,
        label: period === "week" ? format(day, "EEE") : format(day, "d"),
        income: 0,
        expense: 0,
      });
    }
  }
  for (const t of txs) {
    if (t.type === "transfer" || !inRange(t.date, r)) continue;
    const b = map.get(period === "year" ? t.date.slice(0, 7) : t.date);
    if (!b) continue;
    if (t.type === "income") b.income += t.amount;
    else b.expense += t.amount;
  }
  return [...map.values()];
}

export function totals(txs: Transaction[], r: Range) {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.type === "transfer" || !inRange(t.date, r)) continue;
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  return { income, expense };
}

export function spendByCategory(txs: Transaction[], r: Range) {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== "expense" || !inRange(t.date, r)) continue;
    const key = t.categoryId ?? "none";
    map.set(key, (map.get(key) ?? 0) + t.amount);
  }
  return map;
}

export interface BudgetSummary {
  spent: number;
  remaining: number;
  allocated: number;
  /** total - allocated; negative when over-allocated */
  unallocated: number;
  days: number;
  daysLeft: number;
  elapsed: number;
  status: "upcoming" | "active" | "ended";
  rows: {
    categoryId: string;
    allocated: number;
    spent: number;
    left: number;
  }[];
  /** Spent in categories that have no allocation (or no category). */
  unplanned: number;
}

export function summarizeBudget(budget: Budget, txs: Transaction[], today = new Date()): BudgetSummary {
  const r: Range = { start: budget.startDate, end: budget.endDate };
  const byCat = spendByCategory(txs, r);
  const spent = [...byCat.values()].reduce((a, b) => a + b, 0);
  const allocated = budget.allocations.reduce((a, b) => a + b.amount, 0);
  const rows = budget.allocations.map((a) => {
    const s = byCat.get(a.categoryId) ?? 0;
    return { categoryId: a.categoryId, allocated: a.amount, spent: s, left: a.amount - s };
  });
  const allocatedSpent = rows.reduce((a, r2) => a + r2.spent, 0);
  const start = parseISO(budget.startDate);
  const end = parseISO(budget.endDate);
  const days = differenceInCalendarDays(end, start) + 1;
  const todayISO = toISO(today);
  const status =
    todayISO < budget.startDate ? "upcoming" : todayISO > budget.endDate ? "ended" : "active";
  const daysLeft =
    status === "upcoming" ? days : status === "ended" ? 0 : differenceInCalendarDays(end, today) + 1;
  return {
    spent,
    remaining: budget.total - spent,
    allocated,
    unallocated: budget.total - allocated,
    days,
    daysLeft,
    elapsed: days - daysLeft,
    status,
    rows,
    unplanned: spent - allocatedSpent,
  };
}

export function activeBudget(budgets: Budget[], today = new Date()): Budget | undefined {
  const t = toISO(today);
  return budgets
    .filter((b) => t >= b.startDate && t <= b.endDate)
    .sort((a, b) => (a.endDate < b.endDate ? -1 : 1))[0];
}

export function isDateInBudget(budget: Budget, iso: string) {
  return isWithinInterval(parseISO(iso), {
    start: parseISO(budget.startDate),
    end: parseISO(budget.endDate),
  });
}

export interface DayPoint {
  day: number;
  date: string;
  income: number;
  expense: number;
  /** Running income minus expense up to and including this day. */
  net: number;
}

/** One point per day of the month, with a running net balance. */
export function monthSeries(anchor: Date, txs: Transaction[]): DayPoint[] {
  const r = periodRange("month", anchor);
  const days = eachDayOfInterval({ start: parseISO(r.start), end: parseISO(r.end) });
  const map = new Map<string, DayPoint>();
  days.forEach((d, i) => {
    const date = format(d, ISO);
    map.set(date, { day: i + 1, date, income: 0, expense: 0, net: 0 });
  });
  for (const t of txs) {
    if (t.type === "transfer") continue;
    const p = map.get(t.date);
    if (!p) continue;
    if (t.type === "income") p.income += t.amount;
    else p.expense += t.amount;
  }
  let run = 0;
  const out = [...map.values()];
  for (const p of out) {
    run += p.income - p.expense;
    p.net = run;
  }
  return out;
}

export interface CategoryBudgetStatus {
  budget: Budget;
  allocated: number;
  spent: number;
  left: number;
}

/** Budgets that cover `date` and have a split for `categoryId`, with how much of it is already spent. */
export function categoryBudgetStatus(
  budgets: Budget[],
  txs: Transaction[],
  categoryId: string,
  date: string,
  ignoreTransactionId?: string,
): CategoryBudgetStatus[] {
  const out: CategoryBudgetStatus[] = [];
  for (const b of budgets) {
    if (date < b.startDate || date > b.endDate) continue;
    const row = b.allocations.find((a) => a.categoryId === categoryId);
    if (!row) continue;
    let spent = 0;
    for (const t of txs) {
      if (t.id === ignoreTransactionId) continue;
      if (t.type === "expense" && t.categoryId === categoryId && t.date >= b.startDate && t.date <= b.endDate) {
        spent += t.amount;
      }
    }
    out.push({ budget: b, allocated: row.amount, spent, left: row.amount - spent });
  }
  return out;
}
