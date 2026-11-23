"use client";

import Link from "next/link";
import { BellIcon } from "@phosphor-icons/react";
import { buildNotices, unreadCount } from "@/lib/reminders";
import type { AppState } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Bell with an unread badge. Time-based, so only render it after the data has loaded. */
export function NotificationBell({ state, className }: { state: AppState; className?: string }) {
  const count = unreadCount(buildNotices(state), state.seen);
  return (
    <Link
      href="/reminders"
      aria-label={count ? `Notifications, ${count} new` : "Notifications"}
      className={cn(
        "relative grid size-11 shrink-0 place-items-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/70 focus-visible:outline-3 focus-visible:outline-ring",
        className,
      )}
    >
      <BellIcon className="size-5" weight={count ? "fill" : "regular"} />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] leading-5 font-bold text-primary-foreground ring-2 ring-card"
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
