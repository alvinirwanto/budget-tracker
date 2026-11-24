"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretLeftIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Same title position on every page: the title row is always 44px tall and
 * centered, the subtitle hangs below it, and spacing below comes from the page grid.
 */
/** Goes to the page you came from, or Home if there is none. */
function BackButton() {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon-lg"
      className="size-11 shrink-0 rounded-full"
      aria-label="Back"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
    >
      <CaretLeftIcon className="size-5" weight="bold" />
    </Button>
  );
}

export function PageHeader({
  title,
  back,
  action,
  subtitle,
  tabs,
  className,
}: {
  title: string;
  back?: string;
  action?: ReactNode;
  subtitle?: ReactNode;
  /** Tab switch. It sits in the sticky header, so it stays at the top with the title. */
  tabs?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        // Sticks to the top. It reaches the page edges and sits under the phone notch, and the negative
        // margins cancel its padding so nothing moves when it is not stuck.
        "sticky top-0 z-30 -mx-4 -mt-[calc(env(safe-area-inset-top)+1rem)] -mb-5 grid gap-1 bg-background/90 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 backdrop-blur-md md:-mx-8 md:px-8 lg:-mx-10 lg:px-10",
        className,
      )}
    >
      <div className="flex min-h-11 items-center gap-3">
        {back === "history" ? (
          <BackButton />
        ) : back ? (
          <Button asChild variant="secondary" size="icon-lg" className="size-11 shrink-0 rounded-full">
            <Link href={back} aria-label="Back">
              <CaretLeftIcon className="size-5" weight="bold" />
            </Link>
          </Button>
        ) : null}
        <h1 className="min-w-0 flex-1 truncate text-2xl font-extrabold tracking-tight lg:text-3xl">
          {title}
        </h1>
        {action}
      </div>
      {subtitle && (
        <p data-fit className={cn("-mt-1.5 mb-1.5 text-sm text-muted-foreground", back && "pl-14")}>{subtitle}</p>
      )}
      {tabs && <div className="mt-3 mb-2">{tabs}</div>}
    </header>
  );
}

export function Card({
  className,
  children,
  as: Tag = "section",
  ...rest
}: {
  className?: string;
  children: ReactNode;
  as?: "section" | "div" | "article";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn("rounded-2xl bg-card p-4 shadow-card md:p-5 dark:border", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function SectionTitle({
  children,
  action,
  id,
}: {
  children: ReactNode;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 id={id} className="text-lg font-bold">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center">
      <p className="text-base font-bold">{title}</p>
      <p className="max-w-[28ch] text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-40 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
      <div className="h-48 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
      <div className="h-32 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
    </div>
  );
}
