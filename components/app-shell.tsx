"use client";

import {
  createContext,
  useCallback,
  useContext,
  Suspense,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  ChartLineUpIcon,
  ChartPieSliceIcon,
  HouseSimpleIcon,
  ListMagnifyingGlassIcon,
  PlusIcon,
  TagIcon,
  UserCircleIcon,
  WalletIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { RouteTransition } from "@/components/route-transition";
import { Toaster } from "@/components/ui/sonner";
import { Sheet } from "@/components/sheet";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TransactionForm } from "@/components/transaction-form";
import { actions } from "@/lib/store";
import type { Transaction, TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface OpenOptions {
  transaction?: Transaction;
  type?: TransactionType;
  /** yyyy-MM-dd to pre-fill a new transaction */
  date?: string;
}

const SheetContext = createContext<(options?: OpenOptions) => void>(() => {});
export const useTransactionSheet = () => useContext(SheetContext);

const NAV = [
  { href: "/", label: "Home", Icon: HouseSimpleIcon },
  { href: "/activity", label: "Activity", Icon: ListMagnifyingGlassIcon },
  null,
  { href: "/budgets", label: "Budgets", Icon: ChartPieSliceIcon },
  { href: "/profile", label: "Profile", Icon: UserCircleIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<{ open: boolean; options: OpenOptions; n: number }>({
    open: false,
    options: {},
    n: 0,
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const open = useCallback(
    (options: OpenOptions = {}) => setSheet((s) => ({ open: true, options, n: s.n + 1 })),
    [],
  );
  const close = useCallback(() => setSheet((s) => ({ ...s, open: false })), []);
  const ctx = useMemo(() => open, [open]);
  const editing = sheet.options.transaction;

  return (
    <SheetContext.Provider value={ctx}>
      <Suspense fallback={null}>
        <SideNav onAdd={() => open()} />
      </Suspense>
      <div className="min-h-dvh md:pl-24 lg:pl-64">
        <main className="mx-auto w-full max-w-7xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-32 md:px-8 md:pt-8 md:pb-12 lg:px-10 lg:pt-10">
          {children}
        </main>
      </div>
      <Suspense fallback={null}>
        <BottomNav onAdd={() => open()} />
      </Suspense>

      <Sheet
        open={sheet.open}
        onOpenChange={(o) => (o ? undefined : close())}
        title={editing ? "Edit transaction" : "New transaction"}
        description={editing ? undefined : "Choose where the money comes from or goes."}
      >
        {sheet.open && (
          <TransactionForm
            key={sheet.n}
            transaction={editing}
            defaultType={sheet.options.type}
            defaultDate={sheet.options.date}
            onDone={close}
            onDelete={editing ? () => setConfirmDelete(true) : undefined}
          />
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this transaction?"
        description="The money goes back to the pocket it came from."
        confirmLabel="Delete"
        onConfirm={() => {
          if (editing) actions.deleteTransaction(editing.id);
          toast.success("Transaction deleted");
          close();
        }}
      />

      <Suspense fallback={null}>
        <RouteTransition />
      </Suspense>
      <Toaster position="top-center" />
    </SheetContext.Provider>
  );
}

function BottomNav({ onAdd }: { onAdd: () => void }) {
  const pathname = usePathname();
  return (
      <nav
        aria-label="Main"
        data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-200 motion-reduce:transition-none md:hidden"
      >
        <ul className="flex items-end justify-between rounded-[2rem] border bg-card/95 px-2 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.25)] backdrop-blur">
          {NAV.map((item, i) => {
            if (!item) {
              return (
                <li key="fab" className="relative -mt-6 flex-none px-1">
                  <button
                    type="button"
                    onClick={onAdd}
                    aria-label="Add transaction"
                    className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-transform active:scale-95 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
                  >
                    <PlusIcon className="size-7" weight="bold" />
                  </button>
                </li>
              );
            }
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href} className="flex-1" data-i={i}>
                <Link
                  href={item.href}
                  data-nav
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-ring",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-x-5 top-0 h-[3px] rounded-full bg-primary"
                    />
                  )}
                  <item.Icon className="size-6" weight={active ? "fill" : "regular"} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
  );
}

const SIDE = [
  { href: "/", label: "Home", Icon: HouseSimpleIcon },
  { href: "/activity", label: "Activity", Icon: ListMagnifyingGlassIcon },
  { href: "/stats", label: "Statistics", Icon: ChartLineUpIcon },
  { href: "/reminders", label: "Reminders", Icon: BellIcon },
  { href: "/budgets", label: "Budgets", Icon: ChartPieSliceIcon },
  { href: "/pockets", label: "Pockets", Icon: WalletIcon },
  { href: "/categories", label: "Categories", Icon: TagIcon },
  { href: "/profile", label: "Profile", Icon: UserCircleIcon },
] as const;

/** Tablet: icon rail. Desktop: full sidebar. Hidden on phones. */
function SideNav({ onAdd }: { onAdd: () => void }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-24 flex-col gap-4 border-r bg-card/60 px-3 py-6 backdrop-blur md:flex lg:w-64 lg:px-5">
      <p className="flex items-center justify-center gap-3 text-lg font-extrabold tracking-tight lg:justify-start lg:px-2">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
          <WalletIcon className="size-6" weight="fill" />
        </span>
        <span className="hidden leading-tight lg:inline">Budget Tracker</span>
      </p>
      <button
        type="button"
        onClick={onAdd}
        aria-label="Add transaction"
        className="mx-auto mt-2 flex h-12 w-12 items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground shadow-md transition-transform hover:brightness-110 active:scale-95 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring lg:w-full"
      >
        <PlusIcon className="size-6" weight="bold" />
        <span className="hidden lg:inline">Add transaction</span>
      </button>
      <nav aria-label="Main" className="mt-2">
        <ul className="grid gap-1">
          {SIDE.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  data-nav
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-ring lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-sm",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.Icon className="size-6 lg:size-5" weight={active ? "fill" : "regular"} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
