"use client";

import { useSyncExternalStore } from "react";

export type Scheme = "system" | "light" | "dark";
const KEY = "color-scheme";
const listeners = new Set<() => void>();

function read(): Scheme {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

let current: Scheme | null = null;

function apply(scheme: Scheme) {
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.setAttribute("content", scheme === "system" ? "light dark" : scheme);
}

export function setScheme(scheme: Scheme) {
  current = scheme;
  try {
    if (scheme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, scheme);
  } catch {
    /* still applied for this visit */
  }
  apply(scheme);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      current = read();
      apply(current);
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useScheme(): Scheme {
  return useSyncExternalStore(
    subscribe,
    () => (current ??= read()),
    () => "system",
  );
}

/** Runs before first paint so the stored scheme never flashes the wrong one. */
export const NO_FLASH_SCRIPT = `try{var s=localStorage.getItem("${KEY}");if(s==="light"||s==="dark")document.querySelector('meta[name="color-scheme"]').content=s}catch(e){}`;
