import type { AppState, Category, Transaction } from "./types";

export function describeTransaction(t: Transaction, state: AppState) {
  const pocket = state.pockets.find((p) => p.id === t.pocketId);
  const to = state.pockets.find((p) => p.id === t.toPocketId);
  const category: Category | undefined = state.categories.find((c) => c.id === t.categoryId);
  const title =
    t.note ||
    (t.type === "expense"
      ? (category?.name ?? "Expense")
      : t.type === "income"
        ? "Income"
        : `${pocket?.name ?? "?"} to ${to?.name ?? "?"}`);
  const where =
    t.type === "transfer"
      ? `${pocket?.name ?? "Deleted pocket"} to ${to?.name ?? "Deleted pocket"}`
      : `${category && t.type === "expense" ? `${category.name} · ` : ""}${pocket?.name ?? "Deleted pocket"}`;
  const signed = t.type === "expense" ? -t.amount : t.type === "income" ? t.amount : 0;
  return { title, where, signed, category, pocket };
}

export function sortByDateDesc(a: Transaction, b: Transaction) {
  return a.date === b.date ? 0 : a.date < b.date ? 1 : -1;
}
