"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import {
  BracketsCurlyIcon,
  DownloadSimpleIcon,
  FileCsvIcon,
  FileXlsIcon,
  UploadSimpleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Segmented } from "@/components/segmented";
import { Sheet } from "@/components/sheet";
import {
  applyImport,
  download,
  parseCSV,
  parseJSON,
  parseXlsx,
  toCSV,
  toJSON,
  toPortable,
  toXlsx,
  type ImportMode,
  type ParseResult,
} from "@/lib/data-io";
import { actions, useAppState } from "@/lib/store";

const FORMATS = [
  { key: "xlsx", label: "Excel", hint: "All data", Icon: FileXlsIcon },
  { key: "csv", label: "CSV", hint: "Transactions", Icon: FileCsvIcon },
  { key: "json", label: "JSON", hint: "All data", Icon: BracketsCurlyIcon },
] as const;

export function DataTransfer() {
  const state = useAppState();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [parsed, setParsed] = useState<{ name: string; result: ParseResult } | null>(null);
  const [mode, setMode] = useState<ImportMode>("add");
  const [confirmReplace, setConfirmReplace] = useState(false);

  const stamp = () => format(new Date(), "yyyy-MM-dd");

  async function exportAs(kind: (typeof FORMATS)[number]["key"]) {
    setBusy(kind);
    try {
      const portable = toPortable(state);
      if (kind === "json") {
        download(new Blob([toJSON(portable)], { type: "application/json" }), `luar-budget-${stamp()}.json`);
      } else if (kind === "csv") {
        download(new Blob([toCSV(portable)], { type: "text/csv;charset=utf-8" }), `luar-transactions-${stamp()}.csv`);
      } else {
        download(await toXlsx(portable, state), `luar-budget-${stamp()}.xlsx`);
      }
      toast.success(`Exported as ${kind === "xlsx" ? "Excel" : kind.toUpperCase()}`);
    } catch {
      toast.error("Could not export. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function onFile(file: File) {
    const lower = file.name.toLowerCase();
    try {
      let result: ParseResult;
      if (lower.endsWith(".json")) result = parseJSON(await file.text());
      else if (lower.endsWith(".csv")) result = parseCSV(await file.text());
      else if (lower.endsWith(".xlsx")) result = await parseXlsx(await file.arrayBuffer());
      else throw new Error("Use an Excel (.xlsx), CSV or JSON file.");
      setMode("add");
      setParsed({ name: file.name, result });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read this file.");
    }
  }

  function runImport() {
    if (!parsed) return;
    const { next, summary } = applyImport(parsed.result.data, mode, state);
    actions.importState(next);
    const parts = [
      summary.transactions && `${summary.transactions} transaction${summary.transactions === 1 ? "" : "s"}`,
      summary.pockets && `${summary.pockets} pocket${summary.pockets === 1 ? "" : "s"}`,
      summary.categories && `${summary.categories} categor${summary.categories === 1 ? "y" : "ies"}`,
      summary.budgets && `${summary.budgets} budget${summary.budgets === 1 ? "" : "s"}`,
      summary.bills && `${summary.bills} bill${summary.bills === 1 ? "" : "s"}`,
    ].filter(Boolean);
    toast.success(parts.length ? `Imported ${parts.join(", ")}` : "Nothing new to import");
    summary.skipped.forEach((m) => toast.error(m));
    setParsed(null);
  }

  const d = parsed?.result.data;
  const issues = parsed?.result.issues ?? [];
  const total = d ? d.pockets.length + d.categories.length + d.transactions.length + d.budgets.length + d.bills.length : 0;

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <p className="text-sm font-semibold">Export</p>
        <div className="grid grid-cols-3 gap-3">
          {FORMATS.map(({ key, label, hint, Icon }) => (
            <Button
              key={key}
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() => exportAs(key)}
              className="h-auto min-h-24 flex-col gap-1 rounded-2xl px-2 py-4"
            >
              <Icon className="size-7 text-primary" weight="duotone" />
              <span className="text-sm font-bold">{label}</span>
              <span className="text-[11px] font-normal text-muted-foreground">{hint}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        <p className="text-sm font-semibold">Import</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv,.json,application/json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose a file to import"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void onFile(f);
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="h-12 rounded-full font-semibold"
          onClick={() => inputRef.current?.click()}
        >
          <UploadSimpleIcon className="size-5" /> Choose a file
        </Button>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Use a file exported from here, or one you edited. Excel and JSON bring everything. CSV brings
          transactions only: Date, Type, Amount, Pocket, To pocket, Category, Note.
        </p>
      </div>

      <Sheet
        open={parsed !== null}
        onOpenChange={(o) => !o && setParsed(null)}
        title="Import file"
        description={parsed?.name}
      >
        {parsed && d && (
          <div className="grid gap-5 pb-3">
            <dl className="grid grid-cols-2 gap-3">
              {(
                [
                  ["Transactions", d.transactions.length],
                  ["Pockets", d.pockets.length],
                  ["Categories", d.categories.length],
                  ["Budgets", d.budgets.length],
                  ["Bills", d.bills.length],
                ] as const
              ).map(([name, n]) => (
                <div key={name} className="rounded-xl bg-muted px-4 py-3">
                  <dt className="text-xs text-muted-foreground">{name}</dt>
                  <dd className="money-lg mt-1 text-2xl font-bold">{n}</dd>
                </div>
              ))}
            </dl>

            {issues.length > 0 && (
              <div className="rounded-xl bg-amber-400/15 px-4 py-3 text-sm leading-relaxed" role="status">
                <p className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-300">
                  <WarningIcon className="size-4" weight="fill" /> {issues.length} row
                  {issues.length === 1 ? "" : "s"} will be skipped
                </p>
                <ul className="mt-2 grid gap-1 text-muted-foreground">
                  {issues.slice(0, 5).map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                  {issues.length > 5 && <li>and {issues.length - 5} more</li>}
                </ul>
              </div>
            )}

            <div className="grid gap-3">
              <Segmented
            className="bg-background"
                label="Import mode"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "add", label: "Add to my data" },
                  { value: "replace", label: "Replace all" },
                ]}
              />
              <p className="text-sm leading-relaxed text-muted-foreground">
                {mode === "add"
                  ? "Pockets and categories with the same name are reused. Transactions are added on top of what you have. Budgets that overlap an existing one are skipped."
                  : "Everything you have now is deleted and replaced with this file."}
              </p>
            </div>

            <Button
              type="button"
              disabled={total === 0}
              className="h-12 rounded-full text-base font-bold"
              onClick={() => (mode === "replace" ? setConfirmReplace(true) : runImport())}
            >
              <DownloadSimpleIcon className="size-5" /> {total === 0 ? "Nothing to import" : "Import now"}
            </Button>
          </div>
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmReplace}
        onOpenChange={setConfirmReplace}
        title="Replace everything?"
        description="All your current pockets, transactions, categories and budgets will be deleted. This cannot be undone."
        confirmLabel="Replace"
        confirmText={state.user?.email}
        onConfirm={runImport}
      />
    </div>
  );
}
