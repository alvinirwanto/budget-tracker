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
import {
  ACCENTS,
  addSavedColor,
  isCustom,
  removeSavedColor,
  setAccent,
  setScheme,
  toHex,
  useAccent,
  useSavedColors,
  useScheme,
  type Scheme,
} from "@/lib/theme";
import { CheckIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SCHEMES: { value: Scheme; label: string; Icon: Icon }[] = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: CircleHalfIcon },
];

export default function ProfilePage() {
  const scheme = useScheme();
  const accent = useAccent();
  const savedColors = useSavedColors();
  // A custom color in use that is not in the saved list yet.
  const custom = isCustom(accent) && !savedColors.includes(accent);
  const [typeColor, setTypeColor] = useState(false);
  const [removeColor, setRemoveColor] = useState<string | null>(null);
  const [hex, setHex] = useState(() => (isCustom(accent) ? accent : ""));
  const state = useAppState();
  const [confirm, setConfirm] = useState<"reset" | "sample" | null>(null);

  return (
    <div className="grid gap-6 md:grid-cols-2 md:items-start md:gap-x-6">
      <PageHeader className="md:col-span-2" title="Profile" />

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
          <div role="radiogroup" aria-label="Accent color" className="grid grid-cols-5 gap-x-2 gap-y-3 border-t pt-4">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                type="button"
                role="radio"
                aria-checked={accent === a.value}
                aria-label={a.label}
                onClick={() => {
                  setTypeColor(false);
                  setAccent(a.value);
                }}
                className="grid justify-items-center gap-1.5 rounded-lg py-1 text-[11px] font-semibold focus-visible:outline-3 focus-visible:outline-ring"
              >
                <span
                  aria-hidden
                  style={{ backgroundColor: a.swatch }}
                  className={cn(
                    "grid size-11 place-items-center rounded-full ring-offset-2 ring-offset-card transition-shadow",
                    accent === a.value && "ring-2 ring-foreground",
                  )}
                >
                  {accent === a.value && <CheckIcon className="size-5 text-white mix-blend-difference" weight="bold" />}
                </span>
                {a.label}
              </button>
            ))}
            {savedColors.map((c) => (
              <div key={c} className="relative grid justify-items-center">
                <button
                  type="button"
                  role="radio"
                  aria-checked={accent === c}
                  aria-label={`Color ${c}`}
                  onClick={() => {
                    setTypeColor(false);
                    setAccent(c);
                  }}
                  className="grid justify-items-center gap-1.5 rounded-lg py-1 text-[11px] font-semibold focus-visible:outline-3 focus-visible:outline-ring"
                >
                  <span
                    aria-hidden
                    style={{ backgroundColor: c }}
                    className={cn(
                      "grid size-11 place-items-center rounded-full ring-offset-2 ring-offset-card transition-shadow",
                      accent === c && "ring-2 ring-foreground",
                    )}
                  >
                    {accent === c && <CheckIcon className="size-5 text-white mix-blend-difference" weight="bold" />}
                  </span>
                  {c}
                </button>
                <button
                  type="button"
                  aria-label={`Remove color ${c}`}
                  onClick={() => setRemoveColor(c)}
                  className="absolute top-0 right-1 grid size-5 place-items-center rounded-full bg-foreground text-background shadow-sm focus-visible:outline-3 focus-visible:outline-ring"
                >
                  <XIcon className="size-3" weight="bold" />
                </button>
              </div>
            ))}
            <button
              type="button"
              role="radio"
              aria-checked={custom}
              aria-label="Your own color"
              onClick={() => setTypeColor(true)}
              className="grid justify-items-center gap-1.5 rounded-lg py-1 text-[11px] font-semibold focus-visible:outline-3 focus-visible:outline-ring"
            >
              <span
                aria-hidden
                style={custom ? { backgroundColor: accent } : undefined}
                className={cn(
                  "grid size-11 place-items-center rounded-full border border-dashed text-muted-foreground ring-offset-2 ring-offset-card",
                  custom ? "border-solid ring-2 ring-foreground" : typeColor && "border-primary text-primary",
                )}
              >
                {custom ? (
                  <CheckIcon className="size-5 text-white mix-blend-difference" weight="bold" />
                ) : (
                  <PlusIcon className="size-5" weight="bold" />
                )}
              </span>
              Custom
            </button>
          </div>
          {(typeColor || custom) && (
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="size-11 shrink-0 rounded-full border"
                style={{ background: toHex(hex) ?? (custom ? accent : "transparent") }}
              />
              <Input
                aria-label="Hex color"
                placeholder="#ff6600"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={7}
                value={hex || (custom ? accent : "")}
                onChange={(e) => {
                  setHex(e.target.value);
                  const ok = toHex(e.target.value);
                  if (ok) setAccent(ok);
                }}
              />
              <Button
                type="button"
                className="h-11 shrink-0 rounded-full px-4 font-bold"
                disabled={!toHex(hex || (custom ? accent : "")) || savedColors.includes(toHex(hex) ?? "")}
                onClick={() => {
                  const ok = toHex(hex || accent);
                  if (!ok) return;
                  addSavedColor(ok);
                  setAccent(ok);
                  setTypeColor(false);
                  setHex("");
                }}
              >
                Save
              </Button>
            </div>
          )}
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

      <section aria-labelledby="data-title" className="md:col-span-2">
        <SectionTitle id="data-title">Your data</SectionTitle>
        <Card className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center md:gap-8">
          <p className="text-sm text-muted-foreground">
            Your data is saved to your account and follows you to any device you log in on.
          </p>
          <div className="grid grid-cols-2 gap-2 md:w-96">
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
        open={removeColor !== null}
        onOpenChange={(o) => !o && setRemoveColor(null)}
        title={`Remove color ${removeColor ?? ""}?`}
        description={removeColor === accent ? "It is your current color. The app goes back to Pink." : "It leaves your saved colors."}
        confirmLabel="Remove"
        onConfirm={() => {
          if (removeColor) removeSavedColor(removeColor);
          toast.success("Color removed");
        }}
      />

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
        confirmText={state.user?.email}
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
