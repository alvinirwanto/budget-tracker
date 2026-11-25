"use client";

import { useSyncExternalStore } from "react";

/** A small list kept on this device (icons or colors you added), with add and remove. */
export function savedList(key: string, clean: (v: string) => string | null, max = 12) {
  const listeners = new Set<() => void>();
  const NONE: string[] = [];
  let cache: string[] | null = null;

  const read = (): string[] => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) ?? "[]");
      return Array.isArray(raw) ? raw.map((v) => clean(String(v))).filter((v): v is string => !!v).slice(0, max) : [];
    } catch {
      return [];
    }
  };
  const write = (next: string[]) => {
    cache = next;
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* still kept for this visit */
    }
    listeners.forEach((l) => l());
  };

  return {
    use(): string[] {
      return useSyncExternalStore(
        (cb) => {
          listeners.add(cb);
          return () => void listeners.delete(cb);
        },
        () => (cache ??= read()),
        () => NONE,
      );
    },
    add(value: string) {
      const v = clean(value);
      const list = cache ?? read();
      if (v && !list.some((x) => x.toLowerCase() === v.toLowerCase())) write([...list, v].slice(-max));
    },
    remove(value: string) {
      write((cache ?? read()).filter((x) => x !== value));
    },
  };
}
