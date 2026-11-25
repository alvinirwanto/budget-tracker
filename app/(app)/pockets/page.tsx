"use client";

import { useMemo, useState } from "react";
import { PlusIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState, PageHeader, Skeleton } from "@/components/page-bits";
import { MoneyText } from "@/components/money-text";
import { PocketCard } from "@/components/pocket-card";
import { PocketForm } from "@/components/pocket-form";
import { Card, SectionTitle } from "@/components/page-bits";
import { Donut } from "@/components/visuals";
import { Sheet } from "@/components/sheet";
import { actions, useAppState } from "@/lib/store";
import { pocketBalances } from "@/lib/stats";
import { formatIDR } from "@/lib/format";
import { POCKET_LABELS } from "@/lib/icons";
import type { Pocket, PocketKind } from "@/lib/types";

const KINDS: PocketKind[] = ["cash", "bank", "ewallet", "asset"];
const KIND_COLORS: Record<PocketKind, string> = {
  cash: "var(--chart-1)",
  bank: "var(--chart-3)",
  ewallet: "var(--chart-4)",
  asset: "var(--chart-2)",
};

export default function PocketsPage() {
  const state = useAppState();
  const balances = useMemo(() => pocketBalances(state), [state]);
  const [editing, setEditing] = useState<{ pocket?: Pocket; n: number } | null>(null);
  const [confirm, setConfirm] = useState(false);

  if (!state.hydrated) return <Skeleton />;
  const total = [...balances.values()].reduce((a, b) => a + b, 0);
  const groups = KINDS.map((kind) => {
    const pockets = state.pockets.filter((p) => p.kind === kind);
    const sum = pockets.reduce((a, p) => a + Math.max(0, balances.get(p.id) ?? 0), 0);
    return { kind, pockets, sum };
  }).filter((g) => g.pockets.length > 0);
  // Gold and assets are left out of the doughnut: they are always the biggest and hide the rest.
  const shown = groups.filter((g) => g.kind !== "asset");
  const whole = shown.reduce((a, g) => a + g.sum, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
      <PageHeader
        className="lg:col-span-12"
        title="Pockets"
        back="/profile"
        subtitle={<MoneyText>{`${formatIDR(total)} in total`}</MoneyText>}
        action={
          <Button
            className="h-11 rounded-full px-4 font-bold"
            onClick={() => setEditing({ n: Date.now() })}
          >
            <PlusIcon className="size-4" weight="bold" /> New
          </Button>
        }
      />
      <p className="max-w-prose text-sm text-muted-foreground lg:col-span-12">
        A pocket is wherever your money sits: wallet, bank, e-wallet, or something like gold. When you
        spend, you choose which pocket it comes out of.
      </p>

      {state.pockets.length === 0 ? (
        <EmptyState
          title="No pockets yet"
          body="Add your wallet with what is in it now."
          action={<Button className="h-11 rounded-full px-5" onClick={() => setEditing({ n: Date.now() })}>Add pocket</Button>}
        />
      ) : (
        <>
          {whole > 0 && (
            <Card className="flex items-center gap-5 md:gap-8 md:p-6 lg:sticky lg:top-28 lg:col-span-4 lg:flex-col lg:items-stretch lg:gap-6">
              <div className="lg:mx-auto">
              <Donut
                slices={shown.map((g) => ({ value: g.sum, color: KIND_COLORS[g.kind] }))}
                label={shown.map((g) => `${POCKET_LABELS[g.kind]} ${Math.round((g.sum / whole) * 100)}%`).join(", ")}
              />
              </div>
              <ul className="grid min-w-0 flex-1 gap-3">
                {shown.map((g) => (
                  <li key={g.kind} className="flex items-center gap-2.5 text-sm">
                    <i aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: KIND_COLORS[g.kind] }} />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{POCKET_LABELS[g.kind]}</span>
                    <span className="money font-bold">{Math.round((g.sum / whole) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <div className="grid gap-6 lg:col-span-8 lg:grid-cols-2 lg:items-start">
          {groups.map((g) => (
            <section key={g.kind} aria-labelledby={`kind-${g.kind}`}>
              <SectionTitle id={`kind-${g.kind}`}>{POCKET_LABELS[g.kind]}</SectionTitle>
              <ul className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 md:grid-cols-3 md:gap-4 lg:grid-cols-1">
                {g.pockets.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setEditing({ pocket: p, n: Date.now() })}
                      className="block h-full w-full rounded-2xl text-left focus-visible:outline-3 focus-visible:outline-ring"
                      aria-label={`Edit ${p.name}, ${formatIDR(balances.get(p.id) ?? 0)}`}
                    >
                      <PocketCard pocket={p} balance={balances.get(p.id) ?? 0} className="h-full w-full" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          </div>
        </>
      )}

      <Sheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing?.pocket ? `Edit ${editing.pocket.name}` : "New pocket"}
        description="Where some of your money lives."
      >
        {editing && (
          <PocketForm
            key={editing.n}
            pocket={editing.pocket}
            onDone={() => setEditing(null)}
            onDelete={editing.pocket ? () => setConfirm(true) : undefined}
          />
        )}
      </Sheet>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${editing?.pocket?.name ?? "pocket"}?`}
        description="Pockets that already have transactions can't be deleted, so your history stays correct."
        confirmLabel="Delete"
        onConfirm={() => {
          if (editing?.pocket && actions.deletePocket(editing.pocket.id)) {
            toast.success("Pocket deleted");
            setEditing(null);
          } else {
            toast.error("This pocket has transactions. Delete or move those first.");
          }
        }}
      />
    </div>
  );
}
