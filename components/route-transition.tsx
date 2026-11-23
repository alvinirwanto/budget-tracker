"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const BARS = 5;
const STAGGER_MS = 70; // delay between one bar and the next, top to bottom
const BAR_MS = 320;
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

type Phase = "idle" | "covering" | "waiting" | "revealing";

/**
 * Page change curtain made of 5 pink bars, top to bottom.
 * Cover: the bars sweep in from the left, one after another, until the page is hidden.
 * The route changes underneath, then the bars slide out to the right in the same order.
 * Link clicks start with the cover. Other navigations (back button, router.push
 * from code) skip the cover and only play the exit.
 */
export function RouteTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const phase = useRef<Phase>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const first = useRef(true);

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bars = () => Array.from(root.current?.children ?? []) as HTMLElement[];

  function park() {
    const node = root.current;
    if (!node) return;
    bars().forEach((b) => {
      b.getAnimations().forEach((a) => a.cancel());
      b.style.transform = "translateX(-100%)";
    });
    node.style.pointerEvents = "none";
    phase.current = "idle";
  }

  /** Run the same slide on every bar, each one a little later than the one above. */
  function sweep(from: string, to: string) {
    return Promise.all(
      bars().map(
        (b, i) =>
          b.animate([{ transform: from }, { transform: to }], {
            duration: BAR_MS,
            delay: i * STAGGER_MS,
            easing: EASE,
            fill: "both",
          }).finished,
      ),
    );
  }

  function reveal() {
    const node = root.current;
    if (!node) return;
    clearTimeout(timer.current);
    phase.current = "revealing";
    bars().forEach((b) => b.getAnimations().forEach((a) => a.cancel()));
    bars().forEach((b) => (b.style.transform = "translateX(0)"));
    node.style.pointerEvents = "auto";
    sweep("translateX(0)", "translateX(100%)").then(park, park);
  }

  // The route changed: play the exit.
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced()) return;
    if (phase.current === "waiting" || phase.current === "idle") reveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Link clicks: cover first, then navigate.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (reduced()) return;
      const node = root.current;
      if (!node) return;
      const link = (e.target as Element | null)?.closest?.("a");
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // query or hash only: let Next handle it

      e.preventDefault();
      e.stopPropagation();
      if (phase.current !== "idle") return;

      phase.current = "covering";
      node.style.pointerEvents = "auto";
      sweep("translateX(-100%)", "translateX(0)").then(() => {
        phase.current = "waiting";
        router.push(url.pathname + url.search + url.hash);
        // If the route never changes, do not leave the page covered.
        timer.current = setTimeout(reveal, 2500);
      });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <div ref={root} aria-hidden className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {Array.from({ length: BARS }, (_, i) => (
        <div
          key={i}
          className="absolute inset-x-0 bg-primary will-change-transform"
          style={{
            top: `${(i * 100) / BARS}%`,
            height: `calc(${100 / BARS}% + 1px)`, // 1px overlap hides seams between bars
            transform: "translateX(-100%)",
          }}
        />
      ))}
    </div>
  );
}
