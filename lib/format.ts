import { format, parseISO } from "date-fns";

const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const plain = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** Rp 1.250.000 — negatives keep the minus sign in front. */
export function formatIDR(value: number): string {
  const text = idr.format(Math.abs(value)).replace(/\s/g, " ");
  return value < 0 ? `-${text}` : text;
}

/** 1.250.000 without the currency symbol. */
export function formatNumber(value: number): string {
  return plain.format(value);
}

/** 1.250.000 -> compact "1,3jt" style for tight chart labels. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${trim(abs / 1_000_000_000)}M`;
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)}jt`;
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)}rb`;
  return `${sign}${abs}`;
}

function trim(n: number) {
  return (Math.round(n * 10) / 10).toString().replace(".", ",");
}

export const ISO = "yyyy-MM-dd";

export function toISO(date: Date): string {
  return format(date, ISO);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function formatDate(iso: string, pattern = "d MMM yyyy"): string {
  return format(parseISO(iso), pattern);
}

export function parseDigits(text: string): number {
  const digits = text.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}
