import { format, isValid, parse, parseISO } from "date-fns";
import { CATEGORY_COLORS, CATEGORY_ICONS, normalizeHex } from "./icons";
import { ISO } from "./format";
import { balanceOf } from "./stats";
import type { AppState, Bill, BillRepeat, Budget, Category, Pocket, PocketKind, Transaction, TransactionType } from "./types";

/* ------------------------------------------------------------------ */
/* Portable shape: everything refers to things by NAME, so a file can  */
/* be edited by hand in Excel and still import cleanly.                */
/* ------------------------------------------------------------------ */

export interface PortablePocket {
  name: string;
  kind: PocketKind;
  openingBalance: number;
  holding?: string;
}
export interface PortableCategory {
  name: string;
  icon: string;
  color: string;
}
export interface PortableTransaction {
  date: string;
  type: TransactionType;
  amount: number;
  pocket: string;
  toPocket?: string;
  category?: string;
  note: string;
}
export interface PortableBudget {
  name: string;
  startDate: string;
  endDate: string;
  total: number;
  split: { category: string; amount: number }[];
}
export interface PortableBill {
  name: string;
  dueDate: string;
  amount?: number;
  repeat: BillRepeat;
  remindDays: number[];
  paid?: boolean;
}
export interface Portable {
  bills: PortableBill[];
  pockets: PortablePocket[];
  categories: PortableCategory[];
  transactions: PortableTransaction[];
  budgets: PortableBudget[];
}

export type ImportSource = "json" | "xlsx" | "csv";

export interface ParseResult {
  source: ImportSource;
  data: Portable;
  /** Rows that were skipped, with the reason. */
  issues: string[];
}

export type DataParts = Pick<AppState, "pockets" | "categories" | "transactions" | "budgets"> & { bills?: Bill[] };

const EMPTY: Portable = { bills: [], pockets: [], categories: [], transactions: [], budgets: [] };

export function toPortable(state: DataParts): Portable {
  const pocketName = (id?: string) => state.pockets.find((p) => p.id === id)?.name ?? "";
  const catName = (id?: string) => state.categories.find((c) => c.id === id)?.name ?? "";
  return {
    bills: (state.bills ?? []).map((b) => ({
      name: b.name,
      dueDate: b.dueDate,
      amount: b.amount,
      repeat: b.repeat,
      remindDays: b.remindDays,
      paid: b.paid,
    })),
    pockets: state.pockets.map((p) => ({
      name: p.name,
      kind: p.kind,
      openingBalance: p.openingBalance,
      holding: p.holding,
    })),
    categories: state.categories.map((c) => ({ name: c.name, icon: c.icon, color: c.color })),
    transactions: [...state.transactions]
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .map((t) => ({
        date: t.date,
        type: t.type,
        amount: t.amount,
        pocket: pocketName(t.pocketId),
        toPocket: t.toPocketId ? pocketName(t.toPocketId) : undefined,
        category: t.categoryId ? catName(t.categoryId) : undefined,
        note: t.note,
      })),
    budgets: state.budgets.map((b) => ({
      name: b.name,
      startDate: b.startDate,
      endDate: b.endDate,
      total: b.total,
      split: b.allocations.map((a) => ({ category: catName(a.categoryId), amount: a.amount })),
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Small value helpers                                                 */
/* ------------------------------------------------------------------ */

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

function toAmount(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(Math.abs(v)) : null;
  const digits = String(v ?? "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

function toNumberAllowZero(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return 0;
  return toAmount(v);
}

/** Accepts yyyy-MM-dd, dd/MM/yyyy, dd-MM-yyyy, "d MMM yyyy", Excel dates and serial numbers. */
export function toISODate(v: unknown): string | null {
  if (v instanceof Date) {
    return isValid(v) ? format(new Date(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()), ISO) : null;
  }
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return format(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), ISO);
  }
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = parseISO(s.slice(0, 10));
    return isValid(d) ? s.slice(0, 10) : null;
  }
  for (const pattern of ["yyyy/MM/dd", "dd/MM/yyyy", "dd-MM-yyyy", "d MMM yyyy", "d MMMM yyyy"]) {
    const d = parse(s, pattern, new Date());
    if (isValid(d)) return format(d, ISO);
  }
  return null;
}

function toType(v: unknown): TransactionType | null {
  const s = norm(v);
  if (["expense", "spent", "out", "pengeluaran"].includes(s)) return "expense";
  if (["income", "in", "earned", "pemasukan"].includes(s)) return "income";
  if (["transfer", "move", "moved", "pindah"].includes(s)) return "transfer";
  return null;
}

function toKind(v: unknown): PocketKind {
  const s = norm(v).replace(/[^a-z]/g, "");
  if (s === "bank") return "bank";
  if (s === "ewallet" || s === "wallet" || s === "emoney") return "ewallet";
  if (s.includes("gold") || s.includes("asset") || s === "emas") return "asset";
  return "cash";
}

const cleanIcon = (v: unknown) => (norm(v) in CATEGORY_ICONS ? norm(v) : /^[a-z0-9 _-]{2,30}$/i.test(text(v)) ? text(v) : "other");
const cleanColor = (v: unknown) => (norm(v) in CATEGORY_COLORS ? norm(v) : (normalizeHex(text(v)) ?? "slate"));
const text = (v: unknown) => String(v ?? "").trim();

/* ------------------------------------------------------------------ */
/* Rows -> Portable (shared by CSV and Excel)                          */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

/** Lower-case header names with spaces and punctuation removed, so "To pocket" == "topocket". */
function keyed(headers: string[], values: unknown[]): Row {
  const row: Row = {};
  headers.forEach((h, i) => {
    if (h) row[h] = values[i];
  });
  return row;
}
const hk = (s: unknown) => norm(s).replace(/[^a-z0-9]/g, "");

function transactionFromRow(r: Row, line: string, issues: string[]): PortableTransaction | null {
  const date = toISODate(r.date ?? r.tanggal);
  const type = toType(r.type ?? r.tipe);
  const amount = toAmount(r.amount ?? r.jumlah);
  const pocket = text(r.pocket ?? r.from ?? r.dari);
  const toPocket = text(r.topocket ?? r.moveto ?? r.to);
  if (!date) return issues.push(`${line}: date is missing or not recognised`), null;
  if (!type) return issues.push(`${line}: type must be Expense, Income or Transfer`), null;
  if (!amount) return issues.push(`${line}: amount must be a number above 0`), null;
  if (!pocket) return issues.push(`${line}: pocket is missing`), null;
  if (type === "transfer" && !toPocket) return issues.push(`${line}: transfer needs a "To pocket"`), null;
  if (type === "transfer" && norm(toPocket) === norm(pocket)) {
    return issues.push(`${line}: transfer needs two different pockets`), null;
  }
  return {
    date,
    type,
    amount,
    pocket,
    toPocket: type === "transfer" ? toPocket : undefined,
    category: type === "expense" ? text(r.category ?? r.kategori) || undefined : undefined,
    note: text(r.note ?? r.notes ?? r.catatan),
  };
}

function isBlank(r: Row) {
  return Object.values(r).every((v) => v === undefined || v === null || String(v).trim() === "");
}

/** Build Portable from tables keyed by sheet name. Each table is [headers, ...rows]. */
function fromTables(tables: Record<string, unknown[][]>, source: ImportSource): ParseResult {
  const data: Portable = { bills: [], pockets: [], categories: [], transactions: [], budgets: [] };
  const issues: string[] = [];

  const rowsOf = (name: string): { r: Row; line: string }[] => {
    const table = tables[name];
    if (!table || table.length === 0) return [];
    const headers = table[0].map(hk);
    return table
      .slice(1)
      .map((values, i) => ({ r: keyed(headers, values), line: `${label(name)} row ${i + 2}` }))
      .filter(({ r }) => !isBlank(r));
  };

  for (const { r, line } of rowsOf("pockets")) {
    const name = text(r.name);
    if (!name) {
      issues.push(`${line}: name is missing`);
      continue;
    }
    const opening = toNumberAllowZero(r.startingbalance ?? r.openingbalance ?? r.balance);
    if (opening === null) {
      issues.push(`${line}: starting balance is not a number`);
      continue;
    }
    data.pockets.push({
      name,
      kind: toKind(r.type ?? r.kind),
      openingBalance: opening,
      holding: text(r.holding) || undefined,
    });
  }

  for (const { r, line } of rowsOf("categories")) {
    const name = text(r.name);
    if (!name) {
      issues.push(`${line}: name is missing`);
      continue;
    }
    data.categories.push({ name, icon: cleanIcon(r.icon), color: cleanColor(r.color) });
  }

  for (const { r, line } of rowsOf("transactions")) {
    const t = transactionFromRow(r, line, issues);
    if (t) data.transactions.push(t);
  }

  for (const { r, line } of rowsOf("bills")) {
    const name = text(r.name);
    const due = toISODate(r.duedate ?? r.due ?? r.date);
    if (!name || !due) {
      issues.push(`${line}: needs a name and a due date`);
      continue;
    }
    const rawDays = String(r.remind ?? r.reminddays ?? r.reminddaysbefore ?? "3")
      .split(/[,;\s]+/)
      .map(Number)
      .filter((n) => [0, 1, 3, 7].includes(n));
    const days = rawDays.length ? [...new Set(rawDays)].sort((a, b) => b - a) : [3];
    data.bills.push({
      name,
      dueDate: due,
      amount: toAmount(r.amount) ?? undefined,
      repeat: norm(r.repeat) === "once" ? "once" : "monthly",
      remindDays: days,
      paid: ["true", "yes", "paid", "1"].includes(norm(r.paid)) || undefined,
    });
  }

  const splits = rowsOf("budgetsplit");
  for (const { r, line } of rowsOf("budgets")) {
    const name = text(r.name);
    const start = toISODate(r.start ?? r.startdate ?? r.from);
    const end = toISODate(r.end ?? r.enddate ?? r.until);
    const total = toAmount(r.total ?? r.amount);
    if (!name || !start || !end || !total) {
      issues.push(`${line}: needs a name, start date, end date and total`);
      continue;
    }
    if (end < start) {
      issues.push(`${line}: end date is before the start date`);
      continue;
    }
    const split = splits
      .filter(({ r: s }) => norm(s.budget) === norm(name))
      .map(({ r: s, line: l }) => {
        const category = text(s.category);
        const amount = toAmount(s.amount);
        if (!category || !amount) {
          issues.push(`${l}: needs a category and an amount`);
          return null;
        }
        return { category, amount };
      })
      .filter((x): x is { category: string; amount: number } => x !== null);
    data.budgets.push({ name, startDate: start, endDate: end, total, split });
  }

  return { source, data, issues };
}

const label = (key: string) =>
  ({ pockets: "Pockets", categories: "Categories", transactions: "Transactions", budgets: "Budgets", budgetsplit: "Budget split", bills: "Bills" })[
    key
  ] ?? key;

/* ------------------------------------------------------------------ */
/* CSV (transactions only: one table per file)                         */
/* ------------------------------------------------------------------ */

const CSV_HEADER = ["Date", "Type", "Amount", "Pocket", "To pocket", "Category", "Note"];

function csvCell(v: unknown) {
  const s = String(v ?? "");
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(p: Portable): string {
  const lines = [CSV_HEADER.join(",")];
  for (const t of p.transactions) {
    lines.push(
      [t.date, t.type, t.amount, t.pocket, t.toPocket ?? "", t.category ?? "", t.note].map(csvCell).join(","),
    );
  }
  return "﻿" + lines.join("\r\n");
}

/** RFC 4180 parser. Handles quotes, CRLF, BOM and a comma or semicolon delimiter. */
export function parseCSVText(input: string): string[][] {
  const textIn = input.replace(/^﻿/, "");
  const firstLine = textIn.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < textIn.length; i++) {
    const c = textIn[i];
    if (quoted) {
      if (c === '"' && textIn[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && textIn[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function parseCSV(textIn: string): ParseResult {
  const rows = parseCSVText(textIn);
  if (rows.length === 0) throw new Error("The CSV file is empty.");
  return fromTables({ transactions: rows }, "csv");
}

/* ------------------------------------------------------------------ */
/* JSON                                                                */
/* ------------------------------------------------------------------ */

export function toJSON(p: Portable): string {
  return JSON.stringify(
    { app: "luar-budget-tracker", version: 1, exportedAt: new Date().toISOString(), ...p },
    null,
    2,
  );
}

export function parseJSON(textIn: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(textIn);
  } catch {
    throw new Error("This is not a valid JSON file.");
  }
  if (!raw || typeof raw !== "object") throw new Error("This JSON file has no data in it.");
  const o = raw as Record<string, unknown>;
  const list = (k: string): Row[] => (Array.isArray(o[k]) ? (o[k] as Row[]) : []);
  if (!["pockets", "categories", "transactions", "budgets", "bills"].some((k) => Array.isArray(o[k]))) {
    throw new Error("This JSON file does not look like a backup from this app.");
  }

  // Reuse the table logic: turn objects into [headers, ...rows].
  const tableOf = (rows: Row[], headers: string[], pick: (r: Row) => unknown[]): unknown[][] => [
    headers,
    ...rows.map(pick),
  ];
  const tables: Record<string, unknown[][]> = {
    pockets: tableOf(list("pockets"), ["name", "type", "startingbalance", "holding"], (r) => [
      r.name,
      r.kind ?? r.type,
      r.openingBalance ?? r.startingBalance,
      r.holding,
    ]),
    categories: tableOf(list("categories"), ["name", "icon", "color"], (r) => [r.name, r.icon, r.color]),
    transactions: tableOf(
      list("transactions"),
      ["date", "type", "amount", "pocket", "topocket", "category", "note"],
      (r) => [r.date, r.type, r.amount, r.pocket, r.toPocket, r.category, r.note],
    ),
    budgets: tableOf(list("budgets"), ["name", "start", "end", "total"], (r) => [
      r.name,
      r.startDate ?? r.start,
      r.endDate ?? r.end,
      r.total,
    ]),
    bills: tableOf(list("bills"), ["name", "duedate", "amount", "repeat", "remind", "paid"], (r) => [
      r.name,
      r.dueDate ?? r.due,
      r.amount,
      r.repeat,
      Array.isArray(r.remindDays) ? (r.remindDays as number[]).join(", ") : (r.remindDaysBefore ?? r.remindDays),
      r.paid,
    ]),
    budgetsplit: [
      ["budget", "category", "amount"],
      ...list("budgets").flatMap((b) =>
        (Array.isArray(b.split) ? (b.split as Row[]) : []).map((s) => [b.name, s.category, s.amount]),
      ),
    ],
  };
  return fromTables(tables, "json");
}

/* ------------------------------------------------------------------ */
/* Excel                                                               */
/* ------------------------------------------------------------------ */

export async function toXlsx(p: Portable, state: DataParts): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Budget Tracker";
  wb.created = new Date();

  const sheet = (name: string, columns: { header: string; width: number; money?: boolean }[], rows: unknown[][]) => {
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = columns.map((c) => ({ header: c.header, width: c.width }));
    rows.forEach((r) => ws.addRow(r));
    ws.getRow(1).font = { bold: true };
    columns.forEach((c, i) => {
      if (c.money) ws.getColumn(i + 1).numFmt = "#,##0";
    });
    return ws;
  };

  sheet(
    "Transactions",
    [
      { header: "Date", width: 13 },
      { header: "Type", width: 11 },
      { header: "Amount", width: 16, money: true },
      { header: "Pocket", width: 18 },
      { header: "To pocket", width: 18 },
      { header: "Category", width: 18 },
      { header: "Note", width: 44 },
    ],
    p.transactions.map((t) => [t.date, t.type, t.amount, t.pocket, t.toPocket ?? "", t.category ?? "", t.note]),
  );

  const balance = new Map(state.pockets.map((pk) => [pk.name, balanceOf(pk, state.transactions)]));
  sheet(
    "Pockets",
    [
      { header: "Name", width: 18 },
      { header: "Type", width: 12 },
      { header: "Starting balance", width: 18, money: true },
      { header: "Holding", width: 16 },
      { header: "Current balance (info only)", width: 26, money: true },
    ],
    p.pockets.map((pk) => [pk.name, pk.kind, pk.openingBalance, pk.holding ?? "", balance.get(pk.name) ?? 0]),
  );

  sheet(
    "Categories",
    [
      { header: "Name", width: 20 },
      { header: "Icon", width: 14 },
      { header: "Color", width: 12 },
    ],
    p.categories.map((c) => [c.name, c.icon, c.color]),
  );

  sheet(
    "Budgets",
    [
      { header: "Name", width: 22 },
      { header: "Start", width: 13 },
      { header: "End", width: 13 },
      { header: "Total", width: 16, money: true },
    ],
    p.budgets.map((b) => [b.name, b.startDate, b.endDate, b.total]),
  );

  sheet(
    "Budget split",
    [
      { header: "Budget", width: 22 },
      { header: "Category", width: 20 },
      { header: "Amount", width: 16, money: true },
    ],
    p.budgets.flatMap((b) => b.split.map((s) => [b.name, s.category, s.amount])),
  );

  sheet(
    "Bills",
    [
      { header: "Name", width: 22 },
      { header: "Due date", width: 13 },
      { header: "Amount", width: 16, money: true },
      { header: "Repeat", width: 11 },
      { header: "Remind (days before)", width: 20 },
      { header: "Paid", width: 8 },
    ],
    p.bills.map((b) => [b.name, b.dueDate, b.amount ?? "", b.repeat, b.remindDays.join(", "), b.paid ? "yes" : ""]),
  );

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function cellValue(v: unknown): unknown {
  if (v && typeof v === "object" && !(v instanceof Date)) {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((t) => t.text).join("");
    if ("result" in o) return cellValue(o.result);
    if ("text" in o) return o.text;
  }
  return v;
}

export async function parseXlsx(buffer: ArrayBuffer): Promise<ParseResult> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    throw new Error("This is not a valid Excel (.xlsx) file.");
  }
  const tables: Record<string, unknown[][]> = {};
  wb.eachSheet((ws) => {
    const rows: unknown[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const values = (row.values as unknown[]).slice(1).map(cellValue);
      rows.push(values);
    });
    const key = hk(ws.name);
    tables[key] = rows;
  });
  // A single unnamed sheet with transaction-like headers counts as the transactions table.
  if (!tables.transactions) {
    const first = Object.values(tables)[0];
    if (first && first[0]?.map(hk).includes("amount")) tables.transactions = first;
  }
  if (!["pockets", "categories", "transactions", "budgets", "bills"].some((k) => tables[k])) {
    throw new Error("No sheets named Transactions, Pockets, Categories, Budgets or Bills were found.");
  }
  return fromTables(tables, "xlsx");
}

/* ------------------------------------------------------------------ */
/* Apply an import to the current data                                 */
/* ------------------------------------------------------------------ */

export type ImportMode = "add" | "replace";

export interface ImportSummary {
  bills: number;
  pockets: number;
  categories: number;
  transactions: number;
  budgets: number;
  skipped: string[];
}

const uid = () => crypto.randomUUID();

export function applyImport(
  data: Portable,
  mode: ImportMode,
  current: DataParts,
): { next: DataParts; summary: ImportSummary } {
  const pockets: Pocket[] = mode === "replace" ? [] : [...current.pockets];
  const categories: Category[] = mode === "replace" ? [] : [...current.categories];
  const transactions: Transaction[] = mode === "replace" ? [] : [...current.transactions];
  const budgets: Budget[] = mode === "replace" ? [] : [...current.budgets];
  const bills: Bill[] = mode === "replace" ? [] : [...(current.bills ?? [])];
  const summary: ImportSummary = { bills: 0, pockets: 0, categories: 0, transactions: 0, budgets: 0, skipped: [] };

  const pocketId = (name: string, create?: Omit<Pocket, "id">) => {
    const found = pockets.find((p) => norm(p.name) === norm(name));
    if (found) return found.id;
    const made: Pocket = { id: uid(), ...(create ?? { name, kind: "cash", openingBalance: 0 }) };
    pockets.push(made);
    summary.pockets++;
    return made.id;
  };
  const categoryId = (name: string, create?: Omit<Category, "id">) => {
    const found = categories.find((c) => norm(c.name) === norm(name));
    if (found) return found.id;
    const made: Category = { id: uid(), ...(create ?? { name, icon: "other", color: "slate" }) };
    categories.push(made);
    summary.categories++;
    return made.id;
  };

  for (const p of data.pockets) {
    const exists = pockets.some((x) => norm(x.name) === norm(p.name));
    if (exists) continue;
    pocketId(p.name, { name: p.name, kind: p.kind, openingBalance: p.openingBalance, holding: p.holding });
  }
  for (const c of data.categories) {
    if (categories.some((x) => norm(x.name) === norm(c.name))) continue;
    categoryId(c.name, { name: c.name, icon: c.icon, color: c.color });
  }

  for (const t of data.transactions) {
    transactions.push({
      id: uid(),
      type: t.type,
      amount: t.amount,
      date: t.date,
      note: t.note,
      pocketId: pocketId(t.pocket),
      toPocketId: t.type === "transfer" && t.toPocket ? pocketId(t.toPocket) : undefined,
      categoryId: t.type === "expense" && t.category ? categoryId(t.category) : undefined,
    });
    summary.transactions++;
  }

  for (const b of data.budgets) {
    const clash = budgets.find((x) => b.startDate <= x.endDate && b.endDate >= x.startDate);
    if (clash) {
      summary.skipped.push(`Budget "${b.name}" overlaps "${clash.name}", so it was not added`);
      continue;
    }
    const seen = new Set<string>();
    const allocations = b.split
      .map((s) => ({ categoryId: categoryId(s.category), amount: s.amount }))
      .filter((a) => (seen.has(a.categoryId) ? false : (seen.add(a.categoryId), true)));
    budgets.push({ id: uid(), name: b.name, startDate: b.startDate, endDate: b.endDate, total: b.total, allocations });
    summary.budgets++;
  }

  for (const b of data.bills) {
    if (bills.some((x) => norm(x.name) === norm(b.name) && x.dueDate === b.dueDate)) continue;
    bills.push({ id: uid(), ...b });
    summary.bills++;
  }

  return { next: { pockets, categories, transactions, budgets, bills }, summary };
}

/* ------------------------------------------------------------------ */
/* Download helper                                                     */
/* ------------------------------------------------------------------ */

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const EMPTY_PORTABLE = EMPTY;
