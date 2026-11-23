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
