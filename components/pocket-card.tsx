"use client";

import { POCKET_ICONS, POCKET_LABELS } from "@/lib/icons";
import { formatIDR } from "@/lib/format";
import type { Pocket } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PocketCard({
  pocket,
  balance,
  className,
  inset,
}: {
  pocket: Pocket;
  balance: number;
  className?: string;
  /** Sits inside another card: flat, in the muted tone. */
  inset?: boolean;
}) {
  const Icon = POCKET_ICONS[pocket.kind];
  const isAsset = pocket.kind === "asset";
  return (
    <div
      className={cn(
        "grid w-64 shrink-0 gap-4 p-4 md:p-5",
        // A card inside a card gets a smaller corner than the one around it.
        inset ? "rounded-lg bg-muted" : "rounded-2xl bg-card shadow-card dark:border",
        isAsset && "bg-amber-400/10 ring-1 ring-amber-400/40",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-10 place-items-center rounded-full",
          isAsset ? "bg-amber-400/30 text-amber-700 dark:text-amber-300" : "bg-accent text-primary",
        )}
      >
        <Icon className="size-5" weight="duotone" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold">{pocket.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {isAsset && pocket.holding ? pocket.holding : POCKET_LABELS[pocket.kind]}
        </p>
        <p className={cn("money mt-2 text-lg font-extrabold", balance < 0 && "text-expense")}>
          {formatIDR(balance)}
        </p>
      </div>
    </div>
  );
}
