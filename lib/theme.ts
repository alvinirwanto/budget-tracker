"use client";

import { useSyncExternalStore } from "react";
import { onPrefsApplied, queuePrefsPush } from "./prefs";

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
export const NO_FLASH_SCRIPT = `try{var s=localStorage.getItem("${KEY}");var m=document.createElement("meta");m.name="color-scheme";m.content=s==="dark"?"dark":s==="system"?"light dark":"light";document.head.appendChild(m);var d=s==="dark"||(s==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var c=document.createElement("meta");c.name="theme-color";c.content=d?"#0a0e15":"#f7f8fa";document.head.appendChild(c);var a=localStorage.getItem("accent");if(a){var r=document.documentElement;if(/^#[0-9a-f]{6}$/i.test(a)){var n=parseInt(a.slice(1),16),l=(0.299*(n>>16)+0.587*((n>>8)&255)+0.114*(n&255))/255;r.setAttribute("data-accent","custom");r.style.setProperty("--primary",a);r.style.setProperty("--ring",a);r.style.setProperty("--chart-3",a);r.style.setProperty("--primary-foreground",l>0.6?"#0a0e15":"#ffffff")}else r.setAttribute("data-accent",a)}}catch(e){}`;

/** Accent colors. The preset values live in globals.css under [data-accent]; swatch is only for the picker. */
export const ACCENTS = [
  { value: "pink", label: "Pink", swatch: "#ff3378" },
  { value: "lavender", label: "Lavender", swatch: "#8b6ff0" },
  { value: "teal", label: "Teal", swatch: "#0fb5a6" },
  { value: "neon", label: "Neon", swatch: "#9be400" },
  { value: "ocean", label: "Ocean", swatch: "#2f7df6" },
  { value: "sunset", label: "Sunset", swatch: "#ff7a1a" },
  { value: "crimson", label: "Crimson", swatch: "#e11d48" },
  { value: "gold", label: "Gold", swatch: "#e5a400" },
  { value: "graphite", label: "Graphite", swatch: "#475569" },
] as const;
export type Preset = (typeof ACCENTS)[number]["value"];
/** A preset name, or your own color as "#rrggbb". */
export type Accent = Preset | (string & {});
const ACCENT_KEY = "accent";
const accentListeners = new Set<() => void>();
let accent: Accent | null = null;

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
/** "f39" or "#FF3399" -> "#ff3399", or null. */
export function toHex(v: string): string | null {
  const m = HEX.exec(v.trim());
  if (!m) return null;
  const h = m[1].toLowerCase();
  return "#" + (h.length === 3 ? [...h].map((c) => c + c).join("") : h);
}
export const isCustom = (a: string) => a.startsWith("#");

function readAccent(): Accent {
  try {
    const v = localStorage.getItem(ACCENT_KEY) ?? "";
    if (ACCENTS.some((a) => a.value === v)) return v;
    return toHex(v) ?? "pink";
  } catch {
    return "pink";
  }
}

const VARS = ["--primary", "--primary-foreground", "--ring", "--chart-3"] as const;

function paint(next: Accent) {
  const root = document.documentElement;
  if (isCustom(next)) {
    // Text on top of the color: dark on light colors, white on dark ones.
    const n = parseInt(next.slice(1), 16);
    const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    root.dataset.accent = "custom";
    root.style.setProperty("--primary", next);
    root.style.setProperty("--ring", next);
    root.style.setProperty("--chart-3", next);
    root.style.setProperty("--primary-foreground", lum > 0.6 ? "#0a0e15" : "#ffffff");
  } else {
    root.dataset.accent = next;
    VARS.forEach((v) => root.style.removeProperty(v));
  }
}

export function setAccent(next: Accent) {
  accent = next;
  try {
    localStorage.setItem(ACCENT_KEY, next);
  } catch {
    /* still applied for this visit */
  }
  paint(next);
  accentListeners.forEach((l) => l());
  queuePrefsPush();
}

onPrefsApplied(() => {
  accent = readAccent();
  if (typeof document !== "undefined") paint(accent);
  accentListeners.forEach((l) => l());
});

export function useAccent(): Accent {
  return useSyncExternalStore(
    (cb) => {
      accentListeners.add(cb);
      paint((accent ??= readAccent()));
      return () => void accentListeners.delete(cb);
    },
    () => (accent ??= readAccent()),
    () => "pink",
  );
}

/* Colors you added yourself. They stay in the picker until you remove them. */
const SAVED_KEY = "accent-saved";
const savedListeners = new Set<() => void>();
const NONE: string[] = [];
let saved: string[] | null = null;

function readSaved(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.map((v) => toHex(String(v))).filter((v): v is string => !!v) : [];
  } catch {
    return [];
  }
}

function writeSaved(next: string[]) {
  saved = next;
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  } catch {
    /* still kept for this visit */
  }
  savedListeners.forEach((l) => l());
  queuePrefsPush();
}

onPrefsApplied(() => {
  saved = null;
  savedListeners.forEach((l) => l());
});

export function addSavedColor(hex: string) {
  const h = toHex(hex);
  if (!h) return;
  const list = saved ?? readSaved();
  if (!list.includes(h)) writeSaved([...list, h]);
}

export function removeSavedColor(hex: string) {
  writeSaved((saved ?? readSaved()).filter((c) => c !== hex));
  // Removing the color that is in use goes back to the default.
  if (accent === hex) setAccent("pink");
}

export function useSavedColors(): string[] {
  return useSyncExternalStore(
    (cb) => {
      savedListeners.add(cb);
      return () => void savedListeners.delete(cb);
    },
    () => (saved ??= readSaved()),
    () => NONE,
  );
}
