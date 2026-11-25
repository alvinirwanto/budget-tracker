"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretLeftIcon, CaretRightIcon, type Icon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { hasMoved } from "@/lib/nav-history";
import { cn } from "@/lib/utils";

/**
 * Same title position on every page: the title row is always 44px tall and
 * centered, the subtitle hangs below it, and spacing below comes from the page grid.
 */
/** Goes to the page you came from. With no earlier page (opened directly), it goes to the fallback. */
function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon-lg"
      className="size-11 shrink-0 rounded-full"
      aria-label="Back"
      onClick={() => (hasMoved() ? router.back() : router.push(fallback))}
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
        {back && <BackButton fallback={back === "history" ? "/" : back} />}
        <h1 className="min-w-0 flex-1 truncate text-xl font-extrabold tracking-tight md:text-2xl lg:text-3xl">
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
  icon,
}: {
  children: ReactNode;
  action?: ReactNode;
  id?: string;
  /** A Phosphor icon shown before the title, same look as the card titles. */
  icon?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 id={id} className="flex items-center gap-2 font-bold">
        {icon}
        {children}
      </h2>
      {action}
    </div>
  );
}

/** The title row of every card: icon, title, and an optional link. Same height and gap everywhere. */
export function CardTitle({
  icon: IconComponent,
  children,
  href,
  linkLabel,
  id,
}: {
  icon: Icon;
  children: ReactNode;
  href?: string;
  linkLabel?: string;
  id?: string;
}) {
  return (
    <div className="flex min-h-6 items-center justify-between gap-2">
      <h2 id={id} className="flex items-center gap-2 font-bold">
        <IconComponent className="size-5 text-muted-foreground" weight="duotone" /> {children}
      </h2>
      {href && (
        // Padding with an equal negative margin: a big tap area that does not change the row height.
        <Link href={href} className="-my-3 flex items-center gap-1 py-3 text-sm font-semibold text-primary">
          {linkLabel} <CaretRightIcon className="size-4" />
        </Link>
      )}
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

/** One grey block with a light sweep across it. */
function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden style={style} className={cn("skeleton rounded-lg", className)} />;
}

/** Loading screen that fills the page: header, big card, chart card and list rows. */
export function Skeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="flex min-h-[calc(100dvh-8rem)] flex-col gap-6 md:min-h-[calc(100dvh-6rem)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-2.5">
          <Bone className="h-7 w-40 rounded-full" />
          <Bone className="h-4 w-52 rounded-full" />
        </div>
        <Bone className="size-11 rounded-full" />
      </div>

      <div className="grid gap-4 rounded-2xl bg-card p-4 shadow-card md:p-6 dark:border">
        <div className="flex items-center justify-between">
          <Bone className="h-5 w-36 rounded-full" />
          <Bone className="size-11 rounded-full" />
        </div>
        <Bone className="h-11 w-3/4 max-w-sm" />
        <Bone className="h-5 w-full rounded-full" />
        <div className="grid gap-3 border-t pt-4">
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-full" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 rounded-2xl bg-card p-4 shadow-card md:p-6 dark:border">
        <div className="flex items-center justify-between">
          <Bone className="h-6 w-44 rounded-full" />
          <div className="flex gap-2">
            <Bone className="size-11 rounded-full" />
            <Bone className="size-11 rounded-full" />
          </div>
        </div>
        <Bone className="h-12 w-full rounded-full" />
        <div className="flex min-h-40 flex-1 items-end justify-between gap-2">
          {[40, 65, 30, 80, 55, 25, 70, 45, 60, 35].map((h, i) => (
            <div key={i} className="flex h-full flex-1 items-end">
              <Bone className="w-full rounded-full" style={{ height: `${h}%` }} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl bg-card p-4 shadow-card md:p-6 dark:border">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Bone className="size-11 shrink-0 rounded-full" />
            <div className="grid flex-1 gap-2">
              <Bone className="h-4 w-1/2" />
              <Bone className="h-3.5 w-1/3" />
            </div>
            <Bone className="h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
