"use client";

import { useSyncExternalStore } from "react";

/** light is the default. system follows the computer. */
export type Scheme = "system" | "light" | "dark";
const KEY = "color-scheme";
const listeners = new Set<() => void>();

function read(): Scheme {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dark" || v === "system" ? v : "light";
  } catch {
    return "light";
  }
}

let current: Scheme | null = null;

/** The page's color-scheme meta tag. The inline script creates it; this finds it or makes it. */
function meta(): HTMLMetaElement {
  let m = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (!m) {
    m = document.createElement("meta");
    m.name = "color-scheme";
    document.head.appendChild(m);
  }
  return m;
}

function apply(scheme: Scheme) {
  // "light" is a plain light page, "dark" forces dark, "light dark" lets the computer decide.
  meta().content = scheme === "system" ? "light dark" : scheme;
  // The browser bars (phone status bar, installed app frame) take the page color, never the accent.
  const dark = scheme === "dark" || (scheme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const color = dark ? "#0a0e15" : "#f7f8fa";
  const tags = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  if (tags.length) tags.forEach((m) => (m.content = color));
  else {
    const m = document.createElement("meta");
    m.name = "theme-color";
    m.content = color;
    document.head.appendChild(m);
  }
}

export function setScheme(scheme: Scheme) {
  current = scheme;
  try {
    localStorage.setItem(KEY, scheme);
  } catch {
    /* still applied for this visit */
  }
  apply(scheme);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Make sure the page matches what was saved, even if the inline script could not run.
  apply((current ??= read()));
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
    () => "light",
  );
}

/**
 * Runs in the <head> before the first paint so the saved choice never flashes the wrong theme.
 * It creates the meta tag itself, so it never depends on where React puts a tag.
 */
export const NO_FLASH_SCRIPT = `try{var s=localStorage.getItem("${KEY}");var m=document.createElement("meta");m.name="color-scheme";m.content=s==="dark"?"dark":s==="system"?"light dark":"light";document.head.appendChild(m);var d=s==="dark"||(s==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.querySelectorAll('meta[name="theme-color"]').forEach(function(t){t.content=d?"#0a0e15":"#f7f8fa"})}catch(e){}`;
