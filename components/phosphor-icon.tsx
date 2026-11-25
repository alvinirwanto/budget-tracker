"use client";

import type { IconProps } from "@phosphor-icons/react";
import { useCustomIcon } from "@/lib/phosphor";

/** Any Phosphor icon by name. Empty until the icon set has loaded. */
export function PhosphorIcon({ name, ...props }: { name: string } & IconProps) {
  const Icon = useCustomIcon(name);
  // eslint-disable-next-line react-hooks/static-components -- comes from a cache of already-loaded components
  return Icon ? <Icon {...props} /> : null;
}
