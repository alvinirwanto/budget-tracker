"use client";

import { useEffect, useState } from "react";
import type { Icon } from "@phosphor-icons/react";

/** "bowl-food", "bowl food", "BowlFood" and "bowlFood" all mean BowlFood. */
export function pascal(name: string) {
  return name
    .trim()
    .replace(/icon$/i, "")
    .split(/[^a-zA-Z0-9]+|(?=[A-Z][a-z])/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

type Lib = Record<string, Icon | undefined>;
let lib: Promise<Lib> | null = null;
const found = new Map<string, Icon | null>();

/** The whole icon set is big, so it is only fetched when a custom icon name is used. */
export async function loadIcon(name: string): Promise<Icon | null> {
  const key = pascal(name);
  if (!key) return null;
  if (found.has(key)) return found.get(key) ?? null;
  lib ??= import("@phosphor-icons/react") as unknown as Promise<Lib>;
  const mod = await lib;
  const hit = mod[`${key}Icon`] ?? null;
  found.set(key, hit);
  return hit;
}

export function useCustomIcon(name: string | undefined): Icon | null {
  const [icon, setIcon] = useState<{ name: string; Icon: Icon | null } | null>(null);
  useEffect(() => {
    if (!name) return;
    let live = true;
    loadIcon(name).then((Icon) => live && setIcon({ name, Icon }));
    return () => {
      live = false;
    };
  }, [name]);
  return name && icon?.name === name ? icon.Icon : null;
}
