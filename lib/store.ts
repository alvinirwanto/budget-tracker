"use client";

import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { addDays, addMonths, format, parseISO, startOfMonth, subDays } from "date-fns";
import { api, ApiError } from "./api";
import { DEFAULT_CATEGORIES, DEFAULT_POCKETS } from "./defaults";
import { ISO } from "./format";
import { applyServerPrefs, type Prefs } from "./prefs";
import type { AppState, Bill, Budget, Category, Pocket, Transaction } from "./types";

/** The browser-only save from before accounts existed. Used once, to move that data into an account. */
const LEGACY_KEY = "luar-budget-tracker:v1";

const uid = () => crypto.randomUUID();

const EMPTY: AppState = {
  hydrated: false,
  pockets: [],
  categories: [],
  transactions: [],
  budgets: [],
  bills: [],
  seen: [],
};

type Data = Omit<AppState, "hydrated" | "user">;

function initial(): Data {
  return {
    categories: DEFAULT_CATEGORIES,
    pockets: DEFAULT_POCKETS,
    transactions: [],
    budgets: [],
    bills: [],
    seen: [],
  };
}

let state: AppState = EMPTY;
let started = false;
const listeners = new Set<() => void>();

function set(next: AppState) {
  state = next;
  listeners.forEach((l) => l());
}

const goToLogin = () => {
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.assign("/login");
  }
};

/** Load everything for the signed-in user from the server. */
async function refresh() {
  try {
    const { prefs, ...data } = await api<Data & { user: AppState["user"]; prefs?: Prefs }>("GET", "/api/data");
    applyServerPrefs(prefs, data.user?.email ?? "me");
    set({ ...EMPTY, ...data, hydrated: true });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return goToLogin();
    toast.error("Could not load your data. Check your connection and try again.");
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    void refresh();
  }
  return () => {
    listeners.delete(listener);
  };
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

/** Forget everything in memory (log out, switch account). */
export function clearStore() {
  started = false;
  set(EMPTY);
}

const cur = () => state;

function commit(next: Data) {
  set({ ...state, ...next, hydrated: true });
}

/** Save in the background. If it fails, say so and reload what the server really has. */
function track(p: Promise<unknown>) {
  p.catch((err) => {
    if (err instanceof ApiError && err.status === 401) return goToLogin();
    toast.error(
      err instanceof ApiError && err.status === 409 ? err.message : "Could not save that. Your data was reloaded.",
    );
    void refresh();
  });
}
const put = (collection: string, doc: { id: string }) => track(api("PUT", `/api/${collection}/${doc.id}`, doc));
const del = (collection: string, id: string) => track(api("DELETE", `/api/${collection}/${id}`, undefined));

const asBody = (d: Data) => ({
  pockets: d.pockets,
  categories: d.categories,
  transactions: d.transactions,
  budgets: d.budgets,
  bills: d.bills,
  seen: d.seen,
});
const replaceServer = (d: Data) => track(api("PUT", "/api/data", asBody(d)));

/** Everything the screens show, without the account details. */
function data(): Data {
  const { hydrated: _h, user: _u, ...rest } = cur();
  void _h;
  void _u;
  return rest;
}

/* ------------------------------------------------------------------ */
/* Data that was saved in this browser before accounts existed         */
/* ------------------------------------------------------------------ */

export function hasLegacyData(): boolean {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    return !!(d.transactions?.length || d.budgets?.length || (d.pockets?.length ?? 0) > 1);
  } catch {
    return false;
  }
}

/** Upload the old browser data to the signed-in account (replacing what it has), then forget it here. */
export async function adoptLegacyData(): Promise<boolean> {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    const bills = (saved.bills ?? []).map((b: Bill & { remindDaysBefore?: number }) => {
      const { remindDaysBefore, ...rest } = b;
      const days = (rest.remindDays ?? [remindDaysBefore ?? 3]).filter((d: number) => [0, 1, 3, 7].includes(d));
      return { ...rest, remindDays: days.length ? days : [3] };
    });
    const next: Data = {
      pockets: saved.pockets ?? [],
      categories: saved.categories ?? [],
      transactions: saved.transactions ?? [],
      budgets: saved.budgets ?? [],
      bills,
      seen: saved.seen ?? [],
    };
    await api("PUT", "/api/data", asBody(next));
    localStorage.removeItem(LEGACY_KEY);
    await refresh();
    return true;
  } catch {
    return false;
  }
}

export const actions = {
  // Pockets
  savePocket(p: Omit<Pocket, "id"> & { id?: string }) {
    const s = cur();
    const doc = { ...p, id: p.id ?? uid() } as Pocket;
    const pockets = p.id ? s.pockets.map((x) => (x.id === p.id ? { ...x, ...doc } : x)) : [...s.pockets, doc];
    commit({ ...data(), pockets });
    put("pockets", pockets.find((x) => x.id === doc.id) ?? doc);
  },
  /** Returns false when the pocket still has transactions. */
  deletePocket(id: string) {
    const s = cur();
    if (s.transactions.some((t) => t.pocketId === id || t.toPocketId === id)) return false;
    commit({ ...data(), pockets: s.pockets.filter((p) => p.id !== id) });
    del("pockets", id);
    return true;
  },

  // Categories
  /** Returns the id, so a form can select the category it just created. */
  saveCategory(c: Omit<Category, "id"> & { id?: string }) {
    const s = cur();
    const id = c.id ?? uid();
    const doc = { ...c, id } as Category;
    const categories = c.id ? s.categories.map((x) => (x.id === c.id ? { ...x, ...doc } : x)) : [...s.categories, doc];
    commit({ ...data(), categories });
    put("categories", categories.find((x) => x.id === id) ?? doc);
    return id;
  },
  /** Past transactions keep working: they just lose their category. */
  deleteCategory(id: string) {
    const s = cur();
    commit({
      ...data(),
      categories: s.categories.filter((c) => c.id !== id),
      transactions: s.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: undefined } : t)),
      budgets: s.budgets.map((b) => ({ ...b, allocations: b.allocations.filter((a) => a.categoryId !== id) })),
    });
    del("categories", id); // the server tidies transactions and budgets the same way
  },

  // Transactions
  saveTransaction(t: Omit<Transaction, "id"> & { id?: string }) {
    const s = cur();
    const doc = { ...t, id: t.id ?? uid() } as Transaction;
    const transactions = t.id ? s.transactions.map((x) => (x.id === t.id ? doc : x)) : [...s.transactions, doc];
    commit({ ...data(), transactions });
    put("transactions", doc);
  },
  deleteTransaction(id: string) {
    const s = cur();
    commit({ ...data(), transactions: s.transactions.filter((t) => t.id !== id) });
    del("transactions", id);
  },

  // Budgets
  saveBudget(b: Omit<Budget, "id"> & { id?: string }) {
    const s = cur();
    const id = b.id ?? uid();
    const doc = { ...b, id } as Budget;
    const budgets = b.id ? s.budgets.map((x) => (x.id === b.id ? doc : x)) : [...s.budgets, doc];
    commit({ ...data(), budgets });
    put("budgets", doc);
    return id;
  },
  deleteBudget(id: string) {
    const s = cur();
    commit({ ...data(), budgets: s.budgets.filter((b) => b.id !== id) });
    del("budgets", id);
  },

  // Data
  importState(
    next: Pick<AppState, "pockets" | "categories" | "transactions" | "budgets"> & Partial<Pick<AppState, "bills">>,
  ) {
    const merged: Data = { ...data(), ...next, bills: next.bills ?? cur().bills };
    commit(merged);
    replaceServer(merged);
  },

  // Bills & notifications
  saveBill(b: Omit<Bill, "id"> & { id?: string }) {
    const s = cur();
    const id = b.id ?? uid();
    const doc = { ...b, id } as Bill;
    const bills = b.id ? s.bills.map((x) => (x.id === b.id ? { ...x, ...doc } : x)) : [...s.bills, doc];
    commit({ ...data(), bills });
    put("bills", bills.find((x) => x.id === id) ?? doc);
    return id;
  },
  deleteBill(id: string) {
    const s = cur();
    commit({ ...data(), bills: s.bills.filter((b) => b.id !== id) });
    del("bills", id);
  },
  /** Monthly bills move to next month; once-only bills are marked done. */
  markBillPaid(id: string) {
    const s = cur();
    const bills = s.bills.map((b) =>
      b.id !== id
        ? b
        : b.repeat === "monthly"
          ? { ...b, dueDate: format(addMonths(parseISO(b.dueDate), 1), ISO) }
          : { ...b, paid: true },
    );
    commit({ ...data(), bills });
    const changed = bills.find((b) => b.id === id);
    if (changed) put("bills", changed);
  },
  markSeen(keys: string[]) {
    const s = cur();
    const merged = [...new Set([...s.seen, ...keys])];
    if (merged.length === s.seen.length) return;
    commit({ ...data(), seen: merged });
    track(api("PUT", "/api/seen", { seen: merged }));
  },
  reset() {
    const fresh = initial();
    commit(fresh);
    replaceServer(fresh);
  },
  loadSample() {
    const today = new Date();
    const d = (n: number) => format(subDays(today, n), ISO);
    const pockets: Pocket[] = [
      { id: "pocket-wallet", name: "Wallet", kind: "cash", openingBalance: 450_000 },
      { id: "pocket-bca", name: "BCA", kind: "bank", openingBalance: 6_200_000 },
      { id: "pocket-gopay", name: "GoPay", kind: "ewallet", openingBalance: 300_000 },
      {
        id: "pocket-gold",
        name: "Gold",
        kind: "asset",
        openingBalance: 7_800_000,
        holding: "10 gram",
      },
    ];
    const t = (
      daysAgo: number,
      type: Transaction["type"],
      amount: number,
      pocketId: string,
      note: string,
      categoryId?: string,
      toPocketId?: string,
    ): Transaction => ({
      id: uid(),
      type,
      amount,
      pocketId,
      note,
      categoryId,
      toPocketId,
      date: d(daysAgo),
    });
    const monthStart = format(startOfMonth(today), ISO);
    const transactions: Transaction[] = [
      t(0, "expense", 38_000, "pocket-gopay", "Lunch, nasi padang", "cat-food"),
      t(0, "expense", 25_000, "pocket-wallet", "Parking", "cat-gas"),
      t(1, "expense", 120_000, "pocket-bca", "Weekly groceries", "cat-food"),
      t(2, "expense", 200_000, "pocket-bca", "Fuel", "cat-gas"),
      t(3, "expense", 54_000, "pocket-gopay", "Coffee with team", "cat-food"),
      t(4, "expense", 350_000, "pocket-bca", "Electricity", "cat-bills"),
      t(5, "income", 5_000_000, "pocket-bca", "Salary"),
      t(6, "expense", 180_000, "pocket-bca", "Pharmacy", "cat-health"),
      t(8, "expense", 450_000, "pocket-bca", "Sneakers", "cat-shopping"),
      t(9, "expense", 90_000, "pocket-wallet", "Cinema", "cat-fun"),
      t(11, "expense", 75_000, "pocket-gopay", "Dinner", "cat-food"),
      t(14, "expense", 250_000, "pocket-bca", "Internet", "cat-bills"),
      t(20, "expense", 160_000, "pocket-bca", "Fuel", "cat-gas"),
      t(24, "income", 750_000, "pocket-bca", "Freelance"),
      t(33, "expense", 520_000, "pocket-bca", "Groceries", "cat-food"),
      t(48, "expense", 300_000, "pocket-bca", "Gym", "cat-health"),
      t(2, "transfer", 200_000, "pocket-bca", "Top up cash", undefined, "pocket-wallet"),
    ];
    const budgets: Budget[] = [
      {
        id: uid(),
        name: "This month",
        startDate: monthStart,
        endDate: format(addDays(startOfMonth(addDays(today, 31)), -1), ISO),
        total: 2_500_000,
        allocations: [
          { categoryId: "cat-food", amount: 1_000_000 },
          { categoryId: "cat-gas", amount: 400_000 },
          { categoryId: "cat-bills", amount: 500_000 },
          { categoryId: "cat-health", amount: 200_000 },
          { categoryId: "cat-shopping", amount: 300_000 },
        ],
      },
    ];
    const bills: Bill[] = [
      { id: uid(), name: "Electricity", dueDate: format(addDays(today, 1), ISO), amount: 350_000, repeat: "monthly", remindDays: [3, 1] },
      { id: uid(), name: "Internet", dueDate: format(addDays(today, 6), ISO), amount: 250_000, repeat: "monthly", remindDays: [7, 3, 0] },
      { id: uid(), name: "Gym membership", dueDate: format(subDays(today, 2), ISO), amount: 300_000, repeat: "monthly", remindDays: [3] },
      { id: uid(), name: "Car tax", dueDate: format(addDays(today, 40), ISO), repeat: "once", remindDays: [7] },
    ];
    const next: Data = { categories: DEFAULT_CATEGORIES, pockets, transactions, budgets, bills, seen: [] };
    commit(next);
    replaceServer(next);
  },
};
