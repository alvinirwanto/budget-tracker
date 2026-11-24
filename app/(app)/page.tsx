"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  CalendarDotsIcon,
  CaretLeftIcon,
  CaretRightIcon,
  LightbulbIcon,
  MoneyIcon,
  TrendDownIcon,
  TrendUpIcon,
  WalletIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, SectionTitle, Skeleton } from "@/components/page-bits";
import { MoneyText } from "@/components/money-text";
import { NotificationBell } from "@/components/notification-bell";
import { PocketCard } from "@/components/pocket-card";
import { Segmented } from "@/components/segmented";
import { TransactionList } from "@/components/transaction-list";
import { useTransactionSheet } from "@/components/app-shell";
import { BarChart, CategoryBadge, Progress, Ring } from "@/components/visuals";
import { useAppState } from "@/lib/store";
import { formatIDR, todayISO } from "@/lib/format";
import { sortByDateDesc } from "@/lib/describe";
import { CATEGORY_COLORS } from "@/lib/icons";
import {
  activeBudget,
  buckets,
  periodLabel,
  periodRange,
  pocketBalances,
  shiftPeriod,
  spendByCategory,
  summarizeBudget,
  totals,
  type Period,
} from "@/lib/stats";
import type { AppState, Category } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function Home() {
  const state = useAppState();
  // Time-dependent UI only mounts on the client, after the saved data has loaded.
  return state.hydrated ? <HomeView state={state} /> : <Skeleton />;
}

function HomeView({ state }: { state: AppState }) {
  const openSheet = useTransactionSheet();
  const [period, setPeriod] = useState<Period>("month");
  const [anchor, setAnchor] = useState(() => new Date());

  const balances = useMemo(() => pocketBalances(state), [state]);
  const range = periodRange(period, anchor);
  const prevRange = periodRange(period, shiftPeriod(period, anchor, -1));
  const data = useMemo(
    () => buckets(period, anchor, state.transactions),
    [period, anchor, state.transactions],
  );
  const sum = totals(state.transactions, range);
  const prevSum = totals(state.transactions, prevRange);
  const byCat = useMemo(
    () => [...spendByCategory(state.transactions, range).entries()].sort((a, b) => b[1] - a[1]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.transactions, range.start, range.end],
  );
  const budget = activeBudget(state.budgets);
  const budgetSummary = budget ? summarizeBudget(budget, state.transactions) : undefined;
  const recent = useMemo(
    () => [...state.transactions].sort(sortByDateDesc).slice(0, 6),
    [state.transactions],
  );

  const today = todayISO();
  const isCurrent = range.start <= today && today <= range.end;
  const total = [...balances.values()].reduce((a, b) => a + b, 0);
  const assets = state.pockets
    .filter((p) => p.kind === "asset")
    .reduce((a, p) => a + (balances.get(p.id) ?? 0), 0);

  const week = totals(state.transactions, periodRange("week", new Date()));
  const weekNet = week.income - week.expense;
  const daysCounted = isCurrent
    ? differenceInCalendarDays(parseISO(today), parseISO(range.start)) + 1
    : differenceInCalendarDays(parseISO(range.end), parseISO(range.start)) + 1;
  const perDay = Math.round(sum.expense / Math.max(1, daysCounted));
  const delta = prevSum.expense > 0 ? (sum.expense - prevSum.expense) / prevSum.expense : null;
  const left = sum.income - sum.expense;
  const spendShare = total > 0 && assets > 0 ? Math.min(1, Math.max(0.04, (total - assets) / total)) : 1;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-12 lg:gap-6">
      <PageHeader
          className="lg:col-span-12"
          title="Overview"
          action={
            <div className="flex gap-2">
              <Button onClick={() => openSheet({ type: "expense" })} className="h-10 rounded-full px-5 font-bold">
                Spend
              </Button>
              <Button
                onClick={() => openSheet({ type: "income" })}
                variant="outline"
                className="h-10 rounded-full px-5 font-bold"
              >
                Add income
              </Button>
            </div>
          }
        />

      <div className="grid content-start gap-6 lg:col-span-8">
        <Card as="section" aria-label="Balance" className="grid gap-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <WalletIcon className="size-5 text-muted-foreground" weight="duotone" /> Everything you have
            </h2>
            <NotificationBell state={state} />
          </div>
          <p className="money-lg text-5xl leading-none font-bold md:text-6xl">{formatIDR(total)}</p>

          <div
            role="img"
            aria-label={`${Math.round(spendShare * 100)}% spendable, ${Math.round((1 - spendShare) * 100)}% gold and assets`}
            className="flex h-3 gap-1 overflow-hidden rounded-full"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${spendShare * 100}%` }} />
            {assets > 0 && <div className="h-full flex-1 rounded-full bg-amber-400" />}
          </div>

          <ul className="grid gap-3 text-sm">
            <li className="flex items-center gap-2.5">
              <i aria-hidden className="size-2.5 rounded-full bg-primary" />
              <span className="shrink-0 text-muted-foreground">Spendable</span>
              <span className="money ml-auto min-w-0 flex-1 text-right text-base font-bold">{formatIDR(total - assets)}</span>
            </li>
            {assets > 0 && (
              <li className="flex items-center gap-2.5">
                <i aria-hidden className="size-2.5 rounded-full bg-amber-400" />
                <span className="shrink-0 text-muted-foreground">Gold &amp; assets</span>
                <span className="money ml-auto min-w-0 flex-1 text-right text-base font-bold">{formatIDR(assets)}</span>
              </li>
            )}
          </ul>
        </Card>

        <Card as="section" aria-labelledby="chart-title" className="grid gap-4 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 id="chart-title" className="text-lg font-bold" aria-live="polite">
              {periodLabel(period, anchor)}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-lg"
                className="size-11 shrink-0 rounded-full bg-muted hover:bg-muted/70"
                onClick={() => setAnchor((a) => shiftPeriod(period, a, -1))}
                aria-label={`Previous ${period}`}
              >
                <CaretLeftIcon className="size-4" weight="bold" />
              </Button>
              <Button
                variant="ghost"
                size="icon-lg"
                className="size-11 shrink-0 rounded-full bg-muted hover:bg-muted/70 disabled:opacity-40"
                onClick={() => setAnchor((a) => shiftPeriod(period, a, 1))}
                disabled={isCurrent}
                aria-label={`Next ${period}`}
              >
                <CaretRightIcon className="size-4" weight="bold" />
              </Button>
            </div>
          </div>

          <Segmented
            size="sm"
            label="Period"
            value={period}
            onChange={(v) => {
              setPeriod(v);
              setAnchor(new Date());
            }}
            options={[
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
              { value: "year", label: "Year" },
            ]}
          />

          <div className="mt-4 md:mt-5">
            <BarChart data={data} labelEvery={period === "month" ? 5 : 1} />
          </div>

          <p className="flex items-center justify-center gap-5 text-sm font-medium">
            <span className="flex items-center gap-2">
              <i className="size-2.5 rounded-full bg-income/50" /> Income
            </span>
            <span className="flex items-center gap-2">
              <i className="size-2.5 rounded-full bg-primary" /> Expense
            </span>
          </p>
        </Card>
      </div>

      <div className="grid content-start gap-5 lg:col-span-4">
        <Card className="px-5 py-1.5">
          <ul className="divide-y">
            <TotalRow label="Income" amount={sum.income} dot="bg-income" />
            <TotalRow label="Expense" amount={sum.expense} dot="bg-primary" />
            <TotalRow label="Left for saving" amount={left} dot="bg-foreground" negative={left < 0} />
          </ul>
        </Card>

        <Card className="grid gap-4">
          <h2 className="flex items-center gap-2 font-bold">
            <LightbulbIcon className="size-5 text-muted-foreground" weight="duotone" /> Insight
          </h2>
          <p data-fit="2" className="text-sm leading-relaxed text-muted-foreground">
            {week.income === 0 && week.expense === 0
              ? "Nothing recorded this week yet."
              : weekNet >= 0
                ? <MoneyText>{`You saved ${formatIDR(weekNet)} this week`}</MoneyText>
                : <MoneyText>{`You spent ${formatIDR(-weekNet)} more than you earned this week`}</MoneyText>}
          </p>
          <div className="flex items-center gap-3 rounded-2xl bg-accent p-4 text-accent-foreground">
            <CalendarDotsIcon className="size-9 shrink-0 text-primary" weight="duotone" />
            <div className="min-w-0">
              <p className="money truncate text-lg font-extrabold">{formatIDR(perDay)}</p>
              <p className="text-xs font-medium opacity-80">Average spent per day</p>
            </div>
          </div>
        </Card>
      </div>

      <section aria-labelledby="pockets-title" className="lg:col-span-12">
        <SectionTitle
          id="pockets-title"
          action={
            <Link
              href="/pockets"
              className="flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"
            >
              Manage <CaretRightIcon className="size-4" />
            </Link>
          }
        >
          Pockets
        </SectionTitle>
        <ul className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 py-1.5 [scrollbar-width:none] max-md:-my-1.5 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 xl:grid-cols-5">
          {state.pockets.map((p) => (
            <li key={p.id} className="snap-start">
              <PocketCard pocket={p} balance={balances.get(p.id) ?? 0} />
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:col-span-12 lg:grid-cols-3">
        {budget && budgetSummary ? (
          <Link
            href={`/budgets/${budget.id}`}
            className="block rounded-2xl bg-card shadow-card dark:border p-5 transition-colors hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-ring md:p-5"
          >
            <h2 className="mb-4 font-bold">Budget</h2>
            <div className="flex items-center gap-4">
              <Ring
                size={92}
                stroke={10}
                value={budgetSummary.remaining / budget.total}
                over={budgetSummary.remaining < 0}
                label="Budget remaining"
              >
                <span className={cn("money text-base font-bold", budgetSummary.remaining < 0 && "text-expense")}>
                  {Math.round((budgetSummary.remaining / budget.total) * 100)}%
                </span>
              </Ring>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-muted-foreground">{budget.name}</p>
                <p
                  className={cn(
                    "money text-2xl font-extrabold",
                    budgetSummary.remaining < 0 && "text-expense",
                  )}
                >
                  {formatIDR(budgetSummary.remaining)}
                </p>
                <p data-fit className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  <MoneyText>
                    {`of ${formatIDR(budget.total)} · ${budgetSummary.daysLeft} day${budgetSummary.daysLeft === 1 ? "" : "s"} left`}
                  </MoneyText>
                </p>
              </div>
              <CaretRightIcon className="size-5 shrink-0 text-muted-foreground" />
            </div>
          </Link>
        ) : (
          <Card className="grid content-center justify-items-start gap-2">
            <h2 className="font-bold">Budget</h2>
            <p className="text-sm text-muted-foreground">
              Plan a date range and split it by category.
            </p>
            <Button asChild variant="outline" className="h-10 rounded-full">
              <Link href="/budgets">Create a budget</Link>
            </Button>
          </Card>
        )}

        <Card className="md:p-5">
          <h2 className="mb-4 font-bold">By category</h2>
          {byCat.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nothing spent this {period}.
            </p>
          ) : (
            <ul className="grid gap-4">
              {byCat.slice(0, 6).map(([id, amount]) => (
                <CategoryRow
                  key={id}
                  category={state.categories.find((c) => c.id === id)}
                  amount={amount}
                  share={sum.expense ? amount / sum.expense : 0}
                />
              ))}
            </ul>
          )}
        </Card>

        <Card className="grid content-start gap-4 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-bold">
              <MoneyIcon className="size-5 text-muted-foreground" weight="duotone" /> Expense summary
            </h2>
            <Link href="/stats" className="flex min-h-11 items-center gap-1 text-sm font-semibold text-primary">
              Statistics <CaretRightIcon className="size-4" />
            </Link>
          </div>
          <p className="money-lg text-4xl font-bold">{formatIDR(sum.expense)}</p>
          {delta !== null ? (
            <p
              className={cn(
                "flex items-center gap-1.5 text-sm font-semibold",
                delta > 0 ? "text-expense" : "text-income",
              )}
            >
              {delta > 0 ? <TrendUpIcon className="size-4" weight="bold" /> : <TrendDownIcon className="size-4" weight="bold" />}
              {delta > 0 ? "+" : ""}
              {Math.round(delta * 100)}%
              <span className="font-medium text-muted-foreground">vs last {period}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No spending last {period} to compare.</p>
          )}
          <div className="mt-1 grid gap-2.5">
            <CompareBar label={`Last ${period}`} value={prevSum.expense} max={Math.max(sum.expense, prevSum.expense)} muted />
            <CompareBar label={`This ${period}`} value={sum.expense} max={Math.max(sum.expense, prevSum.expense)} />
          </div>
        </Card>
      </div>

      <section aria-labelledby="recent-title" className="lg:col-span-12">
        <SectionTitle
          id="recent-title"
          action={
            <Link
              href="/activity"
              className="flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"
            >
              See all <CaretRightIcon className="size-4" />
            </Link>
          }
        >
          Latest
        </SectionTitle>
        {recent.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            body="Add what you spend or earn and pick the pocket it moves through."
            action={
              <Button className="h-11 rounded-full px-5" onClick={() => openSheet()}>
                Add transaction
              </Button>
            }
          />
        ) : (
          <Card className="px-4 py-1 lg:px-6">
            <TransactionList items={recent} state={state} onSelect={(t) => openSheet({ transaction: t })} />
          </Card>
        )}
      </section>
    </div>
  );
}

function TotalRow({
  label,
  amount,
  dot,
  negative,
}: {
  label: string;
  amount: number;
  dot: string;
  negative?: boolean;
}) {
  return (
    <li>
      <Link
        href="/activity"
        className="flex min-h-16 items-center gap-3 focus-visible:outline-3 focus-visible:outline-ring"
      >
        <i aria-hidden className={cn("size-2.5 rounded-full", dot)} />
        <span className="shrink-0 font-semibold">{label}</span>
        <span className={cn("money min-w-0 flex-1 text-right font-bold", negative && "text-expense")}>{formatIDR(amount)}</span>
        <CaretRightIcon className="size-4 text-muted-foreground" />
      </Link>
    </li>
  );
}

function CompareBar({
  label,
  value,
  max,
  muted,
}: {
  label: string;
  value: number;
  max: number;
  muted?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex justify-between gap-2 text-xs">
        <span className="shrink-0 text-muted-foreground">{label}</span>
        <span className="money min-w-0 flex-1 text-right font-semibold">{formatIDR(value)}</span>
      </div>
      <Progress value={max ? value / max : 0} color={muted ? "var(--lime)" : "var(--primary)"} />
    </div>
  );
}

function CategoryRow({
  category,
  amount,
  share,
}: {
  category?: Category;
  amount: number;
  share: number;
}) {
  const color = CATEGORY_COLORS[category?.color ?? "slate"]?.solid;
  return (
    <li className="flex items-center gap-3">
      <CategoryBadge category={category} size="sm" />
      <div className="grid min-w-0 flex-1 gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-semibold">{category?.name ?? "Uncategorized"}</span>
          <span className="money max-w-[60%] shrink-0 text-sm font-bold">{formatIDR(amount)}</span>
        </div>
        <Progress value={share} color={color} />
      </div>
      <span className="w-9 text-right text-xs text-muted-foreground">{Math.round(share * 100)}%</span>
    </li>
  );
}
