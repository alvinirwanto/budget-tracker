"use client";

import { useEffect } from "react";

/**
 * Keeps every amount inside its box without changing the box.
 *
 * Elements with the money classes are single-line by design. They are kept on one line, and when the
 * number is too wide for the room it has, its font shrinks (the line height stays, so the box height does
 * not change) until it fits. Amounts inside running text (inline) wrap with their sentence as usual.
 */
const SELECTOR = ".money, .money-lg, [data-fit]";
const MIN_SCALE = 0.4;

/** Max lines an element may take: 1 for amounts, or the number in data-fit="2" for a short sentence. */
const linesOf = (el: HTMLElement) => {
  const n = Number(el.dataset.fit);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
};

export function NumberFit() {
  useEffect(() => {
    let frame = 0;

    function run() {
      frame = 0;
      const all = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR)).filter(
        (el) => !(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement),
      );

      // 1) Put everything back to its natural size. One-liners stay on one line.
      for (const el of all) {
        el.style.removeProperty("font-size");
        el.style.removeProperty("line-height");
        if (linesOf(el) === 1) el.style.whiteSpace = "nowrap";
        else el.style.removeProperty("white-space");
      }

      // 2) Measure (reads only, so the browser lays out once).
      const single: { el: HTMLElement; size: number; line: string }[] = [];
      const multi: { el: HTMLElement; size: number; lh: number; max: number }[] = [];
      const range = document.createRange();
      for (const el of all) {
        const cs = getComputedStyle(el);
        if (cs.display === "inline" || cs.display === "none") continue; // inline: it wraps with its sentence
        if (!(el.textContent ?? "").trim()) continue;
        const size = parseFloat(cs.fontSize);
        const lh = cs.lineHeight === "normal" ? size * 1.2 : parseFloat(cs.lineHeight);
        const max = linesOf(el);
        if (max === 1) {
          const room = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
          if (room <= 0) continue; // hidden page
          range.selectNodeContents(el);
          const needed = range.getBoundingClientRect().width;
          if (needed <= room) continue;
          single.push({ el, size: size * Math.max(MIN_SCALE, (room - 1) / needed), line: `${lh}px` });
        } else if (el.clientWidth > 0 && Math.round(el.scrollHeight / lh) > max) {
          multi.push({ el, size, lh, max });
        }
      }

      // 3) Shrink only what did not fit. Line height stays, so the box keeps its height.
      for (const { el, size, line } of single) {
        el.style.fontSize = `${size}px`;
        el.style.lineHeight = line;
      }
      // A smaller font can change the room an element gets, so check again and tighten if needed.
      for (let pass = 0; pass < 4; pass++) {
        let again = false;
        for (const { el } of single) {
          const cs = getComputedStyle(el);
          const room = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
          range.selectNodeContents(el);
          const needed = range.getBoundingClientRect().width;
          if (room > 0 && needed > room) {
            el.style.fontSize = `${Math.max(parseFloat(el.style.fontSize) * ((room - 1) / needed), parseFloat(cs.fontSize) * 0.2)}px`;
            again = true;
          }
        }
        if (!again) break;
      }
      for (const { el, size, lh, max } of multi) {
        el.style.lineHeight = `${lh}px`;
        for (let scale = 0.94; scale >= MIN_SCALE; scale -= 0.06) {
          el.style.fontSize = `${size * scale}px`;
          if (Math.round(el.scrollHeight / lh) <= max) break;
        }
      }
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(run);
    };

    // New or changed numbers, a page swap, a window resize, a font that just loaded.
    const mutations = new MutationObserver(schedule);
    mutations.observe(document.body, { childList: true, subtree: true, characterData: true });
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    window.addEventListener("resize", schedule);
    void document.fonts?.ready.then(schedule);
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      resize.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return null;
}
