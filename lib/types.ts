export type PocketKind = "cash" | "bank" | "ewallet" | "asset";

export interface Pocket {
  id: string;
  name: string;
  kind: PocketKind;
  /** Money (or asset value) in rupiah at the moment the pocket was created. */
  openingBalance: number;
  /** Free text for assets, e.g. "12 gram". */
  holding?: string;
}

export interface Category {
  id: string;
  name: string;
  /** Key into the icon map in lib/icons.ts */
  icon: string;
  /** Key into the color map in lib/icons.ts */
  color: string;
}

export type TransactionType = "expense" | "income" | "transfer";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  /** Pocket the money leaves (expense/transfer) or lands in (income). */
  pocketId: string;
  /** Destination pocket, transfers only. */
  toPocketId?: string;
  /** Expenses only. */
  categoryId?: string;
  /** yyyy-MM-dd */
  date: string;
  note: string;
}

export interface BudgetAllocation {
  categoryId: string;
  amount: number;
}

export interface Budget {
  id: string;
  name: string;
  /** yyyy-MM-dd, inclusive */
  startDate: string;
  /** yyyy-MM-dd, inclusive */
  endDate: string;
  total: number;
  allocations: BudgetAllocation[];
}

export type BillRepeat = "once" | "monthly";

export interface Bill {
  id: string;
  name: string;
  /** Next due date, yyyy-MM-dd. For monthly bills it moves forward each time it is paid. */
  dueDate: string;
  /** Optional, in rupiah. */
  amount?: number;
  repeat: BillRepeat;
  /** Days before the due date to remind, e.g. [7, 3, 1]. 0 means on the day. */
  remindDays: number[];
  /** Once-only bills are marked done instead of moving forward. */
  paid?: boolean;
}

export interface AppState {
  hydrated: boolean;
  /** The signed-in account. */
  user?: { name: string; email: string };
  pockets: Pocket[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  bills: Bill[];
  /** Notification keys the user has already seen. */
  seen: string[];
}
