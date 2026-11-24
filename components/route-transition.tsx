"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const OUT_MS = 320;
const IN_MS = 420;
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

type Phase = "idle" | "leaving" | "waiting" | "entering";

/**
 * Page change: the current page slides down and out, the route changes underneath,
 * and the new page slides in from the bottom to the top.
 * Link clicks start with the exit. Other navigations (back button, router.push
 * from code) skip the exit and only play the entrance.
 */
export function RouteTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const phase = useRef<Phase>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const first = useRef(true);

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const page = () => document.querySelector("main") as HTMLElement | null;

  function leave() {
    const m = page();
    if (!m) return Promise.resolve();
    return m.animate(
      [
        { transform: "translateY(0)", opacity: 1 },
        { transform: "translateY(100vh)", opacity: 0 },
      ],
      { duration: OUT_MS, easing: EASE, fill: "both" },
    ).finished;
  }

  const toTop = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" });

  function enter() {
    toTop();
    const m = page();
    clearTimeout(timer.current);
    if (!m) {
      phase.current = "idle";
      return;
    }
    phase.current = "entering";
    m.getAnimations().forEach((a) => a.cancel());
    const done = () => {
      m.getAnimations().forEach((a) => a.cancel());
      phase.current = "idle";
    };
    m.animate(
      [
        { transform: "translateY(100vh)", opacity: 0 },
        { transform: "translateY(0)", opacity: 1 },
      ],
      { duration: IN_MS, easing: EASE },
    ).finished.then(done, done);
  }

  // The route changed: play the exit.
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced()) return;
    if (phase.current === "waiting" || phase.current === "idle") enter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Link clicks: cover first, then navigate.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (reduced()) return;
      const link = (e.target as Element | null)?.closest?.("a");
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // query or hash only: let Next handle it

      e.preventDefault();
      e.stopPropagation();
      if (phase.current !== "idle") return;

      phase.current = "leaving";
      leave().then(() => {
        phase.current = "waiting";
        toTop();
        router.push(url.pathname + url.search + url.hash);
        // If the route never changes, do not leave the page hidden.
        timer.current = setTimeout(enter, 2500);
      });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return null;
}
