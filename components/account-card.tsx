"use client";

import { useState, useSyncExternalStore } from "react";
import { DownloadSimpleIcon, SignOutIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/page-bits";
import { useInstallPrompt } from "@/components/pwa";
import { api } from "@/lib/api";
import { adoptLegacyData, clearStore, hasLegacyData, useAppState } from "@/lib/store";

const LEGACY_KEY = "luar-budget-tracker:v1";

export function AccountCard() {
  const state = useAppState();
  const { canInstall, install } = useInstallPrompt();
  // Old browser-only data? Read once on the client; false while rendering on the server.
  const hadLegacy = useSyncExternalStore(() => () => {}, hasLegacyData, () => false);
  const [dismissed, setDismissed] = useState(false);
  const legacy = hadLegacy && !dismissed;
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await api("POST", "/api/auth/logout", {});
    } finally {
      clearStore();
      window.location.assign("/login");
    }
  }

  const name = state.user?.name || state.user?.email?.split("@")[0] || "";
  const initial = (name[0] ?? "?").toUpperCase();

  return (
    <section aria-labelledby="account-title" className="grid gap-4 md:col-span-2">
      <SectionTitle id="account-title">Account</SectionTitle>
      <Card className="grid gap-5">
        <div className="flex items-center gap-4">
          <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{name || "Signed in"}</p>
            <p className="truncate text-sm text-muted-foreground">{state.user?.email}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {canInstall && (
            <Button variant="outline" className="h-12 rounded-full font-semibold" onClick={install}>
              <DownloadSimpleIcon className="size-5" /> Install app
            </Button>
          )}
          <Button variant="outline" className="h-12 rounded-full font-semibold" disabled={busy} onClick={logout}>
            <SignOutIcon className="size-5" /> Log out
          </Button>
        </div>

        {legacy && (
          <div className="grid gap-3 rounded-2xl bg-accent p-4" role="status">
            <p className="text-sm leading-relaxed text-accent-foreground">
              <span className="font-semibold">Found data saved in this browser</span> from before accounts. Move it to
              your account? This replaces what your account has now.
            </p>
            <div className="flex gap-2">
              <Button
                className="h-11 flex-1 rounded-full font-bold"
                onClick={async () => {
                  const ok = await adoptLegacyData();
                  toast[ok ? "success" : "error"](ok ? "Moved to your account" : "Could not move it. Try again.");
                  if (ok) setDismissed(true);
                }}
              >
                Move it
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-full bg-card font-semibold"
                onClick={() => {
                  localStorage.removeItem(LEGACY_KEY);
                  setDismissed(true);
                }}
              >
                Discard
              </Button>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
