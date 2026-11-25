import { savedList } from "./saved-list";
import {
  BankIcon,
  BasketIcon,
  BowlFoodIcon,
  BusIcon,
  CarIcon,
  CoinsIcon,
  FilmSlateIcon,
  FirstAidKitIcon,
  GasPumpIcon,
  GiftIcon,
  GraduationCapIcon,
  HouseIcon,
  LightningIcon,
  PawPrintIcon,
  ShoppingBagIcon,
  SparkleIcon,
  TShirtIcon,
  WalletIcon,
  DeviceMobileIcon,
  DotsThreeCircleIcon,
  type Icon,
} from "@phosphor-icons/react";
import type { PocketKind } from "./types";

export const CATEGORY_ICONS: Record<string, Icon> = {
  food: BowlFoodIcon,
  groceries: BasketIcon,
  gas: GasPumpIcon,
  transport: BusIcon,
  car: CarIcon,
  housing: HouseIcon,
  bills: LightningIcon,
  health: FirstAidKitIcon,
  shopping: ShoppingBagIcon,
  clothes: TShirtIcon,
  fun: FilmSlateIcon,
  education: GraduationCapIcon,
  gift: GiftIcon,
  pet: PawPrintIcon,
  other: DotsThreeCircleIcon,
  spark: SparkleIcon,
};

/** Fixed palette so a category color is readable in light and dark mode. */
export const CATEGORY_COLORS: Record<string, { bg: string; fg: string; solid: string }> = {
  lime: { bg: "bg-green-500/15", fg: "text-green-600 dark:text-green-300", solid: "var(--chart-1)" },
  amber: { bg: "bg-amber-400/25", fg: "text-amber-700 dark:text-amber-300", solid: "var(--chart-2)" },
  rose: { bg: "bg-pink-500/15", fg: "text-pink-600 dark:text-pink-300", solid: "var(--chart-3)" },
  sky: { bg: "bg-sky-500/15", fg: "text-sky-600 dark:text-sky-300", solid: "var(--chart-4)" },
  violet: { bg: "bg-violet-500/15", fg: "text-violet-600 dark:text-violet-300", solid: "var(--chart-5)" },
  slate: { bg: "bg-slate-500/15", fg: "text-slate-600 dark:text-slate-300", solid: "oklch(0.6 0.02 250)" },
};

export const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** "f39" or "#FF3399" -> "#ff3399". Null when it is not a hex color. */
export function normalizeHex(v: string): string | null {
  const m = HEX.exec(v.trim());
  if (!m) return null;
  const h = m[1].toLowerCase();
  return "#" + (h.length === 3 ? [...h].map((c) => c + c).join("") : h);
}

/** A category color is one of the named ones or a hex code. */
export function categoryColor(key?: string): { bg: string; fg: string; solid: string; style?: React.CSSProperties } {
  const named = key ? CATEGORY_COLORS[key] : undefined;
  if (named) return named;
  const hex = key ? normalizeHex(key) : null;
  if (hex)
    return {
      bg: "",
      fg: "",
      solid: hex,
      style: { backgroundColor: `color-mix(in srgb, ${hex} 18%, transparent)`, color: hex },
    };
  return CATEGORY_COLORS.slate;
}

export const POCKET_ICONS: Record<PocketKind, Icon> = {
  cash: WalletIcon,
  bank: BankIcon,
  ewallet: DeviceMobileIcon,
  asset: CoinsIcon,
};

export const POCKET_LABELS: Record<PocketKind, string> = {
  cash: "Cash",
  bank: "Bank",
  ewallet: "E-wallet",
  asset: "Gold / asset",
};

/** Icons and colors you added to the category form, kept on this device. */
const icons = savedList("category-icons", (v) => (/^[a-z0-9 _-]{2,30}$/i.test(v.trim()) ? v.trim() : null));
const colors = savedList("category-colors", normalizeHex);
export const useSavedIcons = icons.use;
export const addSavedIcon = icons.add;
export const removeSavedIcon = icons.remove;
export const useSavedCategoryColors = colors.use;
export const addSavedCategoryColor = colors.add;
export const removeSavedCategoryColor = colors.remove;
