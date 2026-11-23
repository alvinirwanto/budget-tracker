"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BellIcon,
  CaretRightIcon,
  CircleHalfIcon,
  MoonIcon,
  SunIcon,
  TagIcon,
  WalletIcon,
  type Icon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, PageHeader, SectionTitle } from "@/components/page-bits";
import { Segmented } from "@/components/segmented";
import { AccountCard } from "@/components/account-card";
import { DataTransfer } from "@/components/data-transfer";
import { actions, useAppState } from "@/lib/store";
import { setScheme, useScheme, type Scheme } from "@/lib/theme";

const SCHEMES: { value: Scheme; label: string; Icon: Icon }[] = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: CircleHalfIcon },
];

export default function ProfilePage() {
  const scheme = useScheme();
  const state = useAppState();
  const [confirm, setConfirm] = useState<"reset" | "sample" | null>(null);

  return (
    <div className="grid gap-6 md:grid-cols-2 md:items-start md:gap-x-6">
      <div className="md:col-span-2">
        <PageHeader title="Profile" />
      </div>

      <AccountCard />

      <section aria-labelledby="look-title">
        <SectionTitle id="look-title">Appearance</SectionTitle>
        <Card className="grid gap-3">
          <Segmented
            label="Color theme"
            value={scheme}
            onChange={setScheme}
            options={SCHEMES.map((s) => ({ value: s.value, label: s.label }))}
          />
          <p className="text-sm text-muted-foreground">
            System follows your phone or computer setting
            and changes with it.
          </p>
        </Card>
      </section>

      <section aria-labelledby="setup-title">
        <SectionTitle id="setup-title">Set up</SectionTitle>
        <Card className="px-4 py-1">
          <ul className="divide-y">
            <NavRow
              href="/reminders"
              Icon={BellIcon}
              title="Reminders & bills"
              body="Bill due dates and budget alerts"
            />
            <NavRow
              href="/pockets"
              Icon={WalletIcon}
              title="Pockets"
              body={`${state.pockets.length} where your money sits`}
            />
            <NavRow
              href="/categories"
              Icon={TagIcon}
              title="Expense categories"
              body={`${state.categories.length} to tag what you spend on`}
            />
          </ul>
        </Card>
      </section>

      <section aria-labelledby="backup-title" className="md:col-span-2">
        <SectionTitle id="backup-title">Backup &amp; transfer</SectionTitle>
        <Card>
          <DataTransfer />
        </Card>
      </section>

      <section aria-labelledby="data-title">
        <SectionTitle id="data-title">Your data</SectionTitle>
        <Card className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Your data is saved to your account and follows you to any device you log in on.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11 rounded-full" onClick={() => setConfirm("sample")}>
              Load sample data
            </Button>
            <Button variant="destructive" className="h-11 rounded-full" onClick={() => setConfirm("reset")}>
              Erase everything
            </Button>
          </div>
        </Card>
      </section>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "reset" ? "Erase everything?" : "Replace with sample data?"}
        description={
          confirm === "reset"
            ? "All pockets, transactions and budgets are removed and the default categories come back."
            : "Your current pockets, transactions and budgets are replaced by an example set."
        }
        confirmLabel={confirm === "reset" ? "Erase" : "Load sample"}
        onConfirm={() => {
          if (confirm === "reset") actions.reset();
          else actions.loadSample();
          toast.success(confirm === "reset" ? "Everything erased" : "Sample data loaded");
        }}
      />
    </div>
  );
}

function NavRow({
  href,
  Icon,
  title,
  body,
}: {
  href: string;
  Icon: Icon;
  title: string;
  body: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 py-3 focus-visible:outline-3 focus-visible:outline-ring"
      >
        <span aria-hidden className="grid size-11 place-items-center rounded-full bg-accent text-primary">
          <Icon className="size-5" weight="duotone" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          <span className="block text-sm text-muted-foreground">{body}</span>
        </span>
        <CaretRightIcon className="size-5 text-muted-foreground" />
      </Link>
    </li>
  );
}
