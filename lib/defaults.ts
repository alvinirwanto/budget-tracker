import type { Category, Pocket } from "./types";

/** What every new account starts with. Shared by the server (sign up) and the app (erase). */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-food", name: "Food", icon: "food", color: "lime" },
  { id: "cat-gas", name: "Gas", icon: "gas", color: "amber" },
  { id: "cat-bills", name: "Bills", icon: "bills", color: "sky" },
  { id: "cat-health", name: "Health", icon: "health", color: "rose" },
  { id: "cat-shopping", name: "Shopping", icon: "shopping", color: "violet" },
  { id: "cat-fun", name: "Entertainment", icon: "fun", color: "slate" },
];

export const DEFAULT_POCKETS: Pocket[] = [
  { id: "pocket-wallet", name: "Wallet", kind: "cash", openingBalance: 0 },
];
