"use client";

import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { CaretDownIcon, CaretLeftIcon, CaretRightIcon, CaretUpIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader, Skeleton } from "@/components/page-bits";
import { Segmented } from "@/components/segmented";
import { Amount, TxIcon } from "@/components/transaction-list";
import { useTransactionSheet } from "@/components/app-shell";
import { describeTransaction } from "@/lib/describe";
import { formatDate, formatIDR } from "@/lib/format";
import { useAppState } from "@/lib/store";
import { DailyView } from "@/components/daily-view";
import type { AppState, Transaction } from "@/lib/types";

type Row = Transaction & { title: string; where: string; signed: number };

const col = createColumnHelper<Row>();

// Stable references: new objects every render made the table re-filter forever.
const COLUMN_VISIBILITY = { type: false };

function globalFilterFn(row: { original: Row }, _id: string, value: string) {
  const q = value.trim().toLowerCase();
  if (!q) return true;
  const r = row.original;
  const digits = q.replace(/\D/g, "");
  return (
    r.title.toLowerCase().includes(q) ||
    r.where.toLowerCase().includes(q) ||
    (digits !== "" && String(r.amount).includes(digits))
  );
}

const SORTS: Record<string, SortingState> = {
  newest: [{ id: "date", desc: true }],
  oldest: [{ id: "date", desc: false }],
  highest: [{ id: "amount", desc: true }],
  lowest: [{ id: "amount", desc: false }],
};

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "expense", label: "Spent" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Moved" },
] as const;

function AllView({ state }: { state: AppState }) {
  const openSheet = useTransactionSheet();
  const [sorting, setSorting] = useState<SortingState>(SORTS.newest);
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]["value"]>("all");
  const [search, setSearch] = useState("");

  const rows = useMemo<Row[]>(
    () =>
      state.transactions.map((t) => {
        const d = describeTransaction(t, state);
        return { ...t, title: d.title, where: d.where, signed: d.signed };
      }),
    [state],
  );

  const columnFilters = useMemo<ColumnFiltersState>(
    () => (typeFilter === "all" ? [] : [{ id: "type", value: typeFilter }]),
    [typeFilter],
  );

  const columns = useMemo(
    () => [
      col.accessor("date", {
        header: "Date",
        cell: (c) => formatDate(c.getValue()),
        sortingFn: (a, b) =>
          a.original.date === b.original.date
            ? 0
            : a.original.date < b.original.date
              ? -1
              : 1,
      }),
      col.accessor("title", { header: "Transaction", enableSorting: false }),
      col.accessor("amount", { header: "Amount" }),
      col.accessor("type", { header: "Type", filterFn: "equalsString" }),
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnFilters, globalFilter: search, columnVisibility: COLUMN_VISIBILITY },
    onSortingChange: setSorting,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
    autoResetPageIndex: false,
  });

  const sortKey =
    Object.entries(SORTS).find(
      ([, v]) => v[0].id === sorting[0]?.id && v[0].desc === sorting[0]?.desc,
    )?.[0] ?? "newest";
  const visible = table.getRowModel().rows;
  const filteredTotal = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const first = filteredTotal === 0 ? 0 : pageIndex * pageSize + 1;
  const last = Math.min(filteredTotal, (pageIndex + 1) * pageSize);

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_14rem] lg:items-center">
        <div className="relative">
          <MagnifyingGlassIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              table.setPageIndex(0);
            }}
            placeholder="Search note, category, pocket"
            aria-label="Search transactions"
            className="pl-11"
          />
        </div>
        <Segmented
          className="lg:w-96"
          label="Filter by type"
          value={typeFilter}
          onChange={(v) => {
            setTypeFilter(v);
            table.setPageIndex(0);
          }}
          options={[...TYPE_FILTERS]}
        />
        <Select value={sortKey} onValueChange={(v) => setSorting(SORTS[v])}>
          <SelectTrigger className="w-full" aria-label="Sort by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="highest">Highest amount</SelectItem>
            <SelectItem value="lowest">Lowest amount</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredTotal === 0 ? (
        <EmptyState
          title={rows.length === 0 ? "No transactions yet" : "Nothing matches"}
          body={
            rows.length === 0
              ? "Tap the + button to add your first one."
              : "Try a different search or filter."
          }
        />
      ) : (
        <div className="@container rounded-2xl bg-card shadow-card dark:border px-2 py-1 md:px-4 md:py-2">
          <Table aria-label="Transactions">
            <TableHeader className="@max-md:sr-only">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="hover:bg-transparent">
                  {hg.headers.map((h) => {
                    const sorted = h.column.getIsSorted();
                    const cls =
                      h.column.id === "date"
                        ? "hidden @md:table-cell"
                        : h.column.id === "amount"
                          ? "text-right"
                          : "";
                    return (
                      <TableHead
                        key={h.id}
                        className={cls}
                        aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                      >
                        {h.column.getCanSort() ? (
                          <button
                            type="button"
                            onClick={h.column.getToggleSortingHandler()}
                            className="inline-flex min-h-9 items-center gap-1 font-semibold"
                          >
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            {sorted === "asc" && <CaretUpIcon className="size-3.5" weight="bold" />}
                            {sorted === "desc" && <CaretDownIcon className="size-3.5" weight="bold" />}
                          </button>
                        ) : (
                          flexRender(h.column.columnDef.header, h.getContext())
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {visible.map((row) => {
                const t = row.original;
                return (
                  <TableRow
                    key={row.id}
                    tabIndex={0}
                    onClick={() => openSheet({ transaction: state.transactions.find((x) => x.id === t.id) })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openSheet({ transaction: state.transactions.find((x) => x.id === t.id) });
                      }
                    }}
                    className="cursor-pointer focus-visible:outline-3 focus-visible:outline-ring"
                  >
                    <TableCell className="hidden text-muted-foreground @md:table-cell">
                      {formatDate(t.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 py-1">
                        <TxIcon t={t} state={state} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{t.title}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {t.where}
                            <span className="@md:hidden"> · {formatDate(t.date, "d MMM")}</span>
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Amount t={t} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {filteredTotal > pageSize && (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            className="h-11 rounded-full px-4"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <CaretLeftIcon className="size-4" /> Prev
          </Button>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {first}–{last} of {filteredTotal}
          </p>
          <Button
            variant="outline"
            className="h-11 rounded-full px-4"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next <CaretRightIcon className="size-4" />
          </Button>
        </nav>
      )}
      <p className="sr-only">{formatIDR(rows.reduce((a, r) => a + r.signed, 0))}</p>
    </div>
  );
}

export default function ActivityPage() {
  const state = useAppState();
  const [mode, setMode] = useState<"daily" | "all">("daily");

  if (!state.hydrated) return <Skeleton />;
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Activity"
        subtitle={`${state.transactions.length} transaction${state.transactions.length === 1 ? "" : "s"}`}
      />
      <Segmented
        label="View"
        value={mode}
        onChange={setMode}
        className="lg:max-w-xs"
        options={[
          { value: "daily", label: "Daily" },
          { value: "all", label: "All" },
        ]}
      />
      {mode === "daily" ? <DailyView state={state} /> : <AllView state={state} />}
    </div>
  );
}
