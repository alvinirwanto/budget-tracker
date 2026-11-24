"use client";

import { useEffect } from "react";

/** Text-like fields that bring up the on-screen keyboard. */
function isTextField(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly;
  if (el instanceof HTMLInputElement) {
    return !el.readOnly && !["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "image"].includes(el.type);
  }
  return el.isContentEditable;
}

/**
 * Keeps the field you are typing in above the on-screen keyboard.
 *
 * The layout viewport already shrinks with the keyboard (interactive-widget=resizes-content in the
 * viewport meta). This adds the rest, for phones and tablets only:
 *  - when a field gets focus, and again while the keyboard slides in, scroll it into the middle of what is
 *    still visible (iOS Safari keeps the layout and only shrinks the visual viewport);
 *  - mark the page with data-keyboard="open" so the bottom bar can step aside instead of covering the field.
 */
export function KeyboardAware() {
  useEffect(() => {
    const touch = window.matchMedia("(pointer: coarse)");
    const root = document.documentElement;
    let active: HTMLElement | null = null;
    let timers: ReturnType<typeof setTimeout>[] = [];

    const clearTimers = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };

    function reveal() {
      if (!active || !active.isConnected) return;
      const vv = window.visualViewport;
      const top = vv?.offsetTop ?? 0;
      const bottom = top + (vv?.height ?? window.innerHeight);
      const rect = active.getBoundingClientRect();
      const margin = 16;
      if (rect.bottom > bottom - margin || rect.top < top + margin) {
        active.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      }
    }

    function onFocusIn(e: FocusEvent) {
      if (!touch.matches || !isTextField(e.target)) return;
      active = e.target;
      root.dataset.keyboard = "open";
      clearTimers();
      // The keyboard takes a moment to appear, and its size changes while it animates.
      timers = [setTimeout(reveal, 50), setTimeout(reveal, 300), setTimeout(reveal, 600)];
    }

    function onFocusOut(e: FocusEvent) {
      // Moving from one field to another keeps the keyboard open.
      if (isTextField(e.relatedTarget)) return;
      active = null;
      clearTimers();
      setTimeout(() => {
        if (!active) delete root.dataset.keyboard;
      }, 100);
    }

    const vv = window.visualViewport;
    vv?.addEventListener("resize", reveal);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      clearTimers();
      vv?.removeEventListener("resize", reveal);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      delete root.dataset.keyboard;
    };
  }, []);

  return null;
}
