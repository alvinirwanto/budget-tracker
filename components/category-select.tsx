"use client";

import { useState } from "react";
import { PlusIcon } from "@phosphor-icons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryForm } from "@/components/category-form";
import { Sheet } from "@/components/sheet";
import { useAppState } from "@/lib/store";

const NEW = "__new__";

/** Category dropdown with a "New category" row at the bottom that creates one without leaving the form. */
export function CategorySelect({
  value,
  onChange,
  hiddenIds = [],
  placeholder = "Choose a category",
  label = "Category",
  className,
}: {
  value: string | undefined;
  onChange: (id: string) => void;
  /** Categories to leave out, e.g. ones already used in another row. */
  hiddenIds?: string[];
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  const { categories } = useAppState();
  const [creating, setCreating] = useState<number | null>(null);

  return (
    <>
      <Select
        value={value ?? ""}
        onValueChange={(v) => {
          if (v === NEW) setCreating(Date.now());
          else onChange(v);
        }}
      >
        <SelectTrigger className={className ?? "w-full"} aria-label={label}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {categories
            .filter((c) => c.id === value || !hiddenIds.includes(c.id))
            .map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          {categories.length > 0 && <SelectSeparator />}
          <SelectItem value={NEW} className="font-semibold text-primary focus:text-primary">
            <PlusIcon className="size-4" weight="bold" /> New category
          </SelectItem>
        </SelectContent>
      </Select>

      <Sheet
        open={creating !== null}
        onOpenChange={(o) => !o && setCreating(null)}
        title="New category"
        description="It is added to your categories and selected for you."
      >
        {creating !== null && (
          <CategoryForm
            key={creating}
            onDone={(id) => {
              onChange(id);
              setCreating(null);
            }}
          />
        )}
      </Sheet>
    </>
  );
}
