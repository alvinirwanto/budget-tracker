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
import { Sheet } from "@/components/sheet";
import { actions, useAppState } from "@/lib/store";
import { pocketBalances } from "@/lib/stats";
import { formatIDR } from "@/lib/format";
import type { Pocket } from "@/lib/types";

export default function PocketsPage() {
  const state = useAppState();
  const balances = useMemo(() => pocketBalances(state), [state]);
  const [editing, setEditing] = useState<{ pocket?: Pocket; n: number } | null>(null);
  const [confirm, setConfirm] = useState(false);

  if (!state.hydrated) return <Skeleton />;
  const total = [...balances.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="grid gap-6">
      <PageHeader
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
      <p className="max-w-prose text-sm text-muted-foreground">
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
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {state.pockets.map((p) => (
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
