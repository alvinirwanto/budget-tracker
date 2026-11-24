import type { ReactNode } from "react";
import { WalletIcon } from "@phosphor-icons/react/ssr";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="relative w-full max-w-md">
        <p className="mb-8 flex items-center justify-center gap-3 text-3xl font-extrabold tracking-tight">
          <span aria-hidden className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <WalletIcon className="size-7" weight="fill" />
          </span>
          Budget Tracker
        </p>
        {children}
      </div>
    </main>
  );
}
