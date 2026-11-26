"use client";

import { api } from "./api";

/** Look and picker choices that follow the account to every device. */
export interface Prefs {
  accent?: string;
  accentSaved?: string[];
  icons?: string[];
  categoryColors?: string[];
}

/** Where each one is kept on this device (also used so the page paints right away, before the server answers). */
const KEYS = {
  accent: "accent",
  accentSaved: "accent-saved",
  icons: "category-icons",
  categoryColors: "category-colors",
} as const;
const LISTS = ["accentSaved", "icons", "categoryColors"] as const;

const reloaders = new Set<() => void>();
/** A store calls this once so it can re-read after the server's copy lands. */
export function onPrefsApplied(fn: () => void) {
  reloaders.add(fn);
}

function readLocal(): Prefs {
  const out: Prefs = {};
  try {
    const a = localStorage.getItem(KEYS.accent);
    if (a) out.accent = a;
    for (const k of LISTS) {
      const raw = JSON.parse(localStorage.getItem(KEYS[k]) ?? "[]");
      out[k] = Array.isArray(raw) ? raw.map(String) : [];
    }
  } catch {
    /* storage blocked: nothing local to use */
  }
  return out;
}

function writeLocal(p: Prefs) {
  try {
    if (p.accent) localStorage.setItem(KEYS.accent, p.accent);
    else localStorage.removeItem(KEYS.accent);
    for (const k of LISTS) localStorage.setItem(KEYS[k], JSON.stringify(p[k] ?? []));
  } catch {
    /* still works for this visit */
  }
}

const union = (a: string[] = [], b: string[] = []) => {
  const seen = new Set(a.map((x) => x.toLowerCase()));
  return [...a, ...b.filter((x) => !seen.has(x.toLowerCase()))];
};
const same = (a: Prefs, b: Prefs) => JSON.stringify(a) === JSON.stringify(b);

let ready = false;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Send what this device has now to the account (a moment after the last change). */
export function queuePrefsPush() {
  if (!ready) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    api("PUT", "/api/prefs", readLocal()).catch(() => {
      /* next change tries again */
    });
  }, 400);
}

/**
 * Called once the account's data has loaded. The first time this device meets this account,
 * whatever the browser already had is added to the account. After that, the account is the truth.
 */
export function applyServerPrefs(server: Prefs | undefined, who: string) {
  const flag = `prefs-synced:${who}`;
  let first = true;
  try {
    first = !localStorage.getItem(flag);
  } catch {
    /* treat as first */
  }
  const from = server ?? {};
  let merged: Prefs = from;
  if (first) {
    const local = readLocal();
    merged = {
      accent: from.accent ?? local.accent,
      accentSaved: union(from.accentSaved, local.accentSaved),
      icons: union(from.icons, local.icons),
      categoryColors: union(from.categoryColors, local.categoryColors),
    };
  }
  writeLocal(merged);
  reloaders.forEach((r) => r());
  ready = true;
  if (first) {
    try {
      localStorage.setItem(flag, "1");
    } catch {
      /* ignore */
    }
  }
  if (first && !same(merged, from)) {
    api("PUT", "/api/prefs", merged).catch(() => {
      /* next change tries again */
    });
  }
}
