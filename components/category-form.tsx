"use client";

import { Controller, useForm, type Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { CheckIcon, PlusIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Field } from "@/components/fields";
import { CategoryBadge } from "@/components/visuals";
import { categorySchema, type CategoryValues } from "@/lib/schemas";
import { actions } from "@/lib/store";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PhosphorIcon } from "@/components/phosphor-icon";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  addSavedCategoryColor,
  addSavedIcon,
  normalizeHex,
  removeSavedCategoryColor,
  removeSavedIcon,
  useSavedCategoryColors,
  useSavedIcons,
} from "@/lib/icons";
import { loadIcon } from "@/lib/phosphor";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

export function CategoryForm({
  category,
  onDone,
  onDelete,
}: {
  category?: Category;
  onDone: (id: string) => void;
  onDelete?: () => void;
}) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<CategoryValues>({
    resolver: yupResolver(categorySchema) as Resolver<CategoryValues>,
    defaultValues: {
      name: category?.name ?? "",
      icon: category?.icon ?? "food",
      color: category?.color ?? "lime",
    },
  });
  const icon = watch("icon");
  const color = watch("color");

  // "+" opens a box to type your own. It starts open when the saved value is not one of the presets.
  const savedIcons = useSavedIcons();
  const savedColors = useSavedCategoryColors();
  const [removing, setRemoving] = useState<{ kind: "icon" | "color"; value: string } | null>(null);
  const [typeIcon, setTypeIcon] = useState(
    () => !!category && !(category.icon in CATEGORY_ICONS) && !savedIcons.includes(category.icon),
  );
  const [typeColor, setTypeColor] = useState(
    () => !!category && !(category.color in CATEGORY_COLORS) && !savedColors.includes(category.color),
  );

  const onSubmit = handleSubmit(async (v) => {
    if (!(v.icon in CATEGORY_ICONS) && !(await loadIcon(v.icon))) {
      setError("icon", { message: `No Phosphor icon is called "${v.icon}"` });
      return;
    }
    if (!(v.color in CATEGORY_COLORS)) {
      const hex = normalizeHex(v.color);
      if (!hex) {
        setError("color", { message: "Use a hex color like #ff6600" });
        return;
      }
      v = { ...v, color: hex };
    }
    const id = actions.saveCategory({ id: category?.id, ...v });
    toast.success(category ? "Category updated" : "Category added");
    onDone(id);
  });

  return (
    <>
    <form
      onSubmit={(e) => {
        // Forms can sit inside another form's sheet: never let the submit reach it.
        e.stopPropagation();
        void onSubmit(e);
      }}
      noValidate className="grid gap-5 pb-3">
      <div className="flex items-end gap-3">
        <CategoryBadge category={{ icon, color }} size="lg" />
        <Field label="Name" htmlFor="cat-name" error={errors.name?.message} className="flex-1">
          <Input
            id="cat-name"
            placeholder="e.g. Coffee"
            autoComplete="off"
            {...register("name")}
          />
        </Field>
      </div>

      <Field
        label="Icon"
        error={errors.icon?.message}
        hint={typeIcon ? "Type a name from phosphoricons.com, like coffee or bowl-food." : undefined}
      >
        <Controller
          control={control}
          name="icon"
          render={({ field }) => (
            <div className="grid gap-3">
              <ToggleGroup
                type="single"
                value={typeIcon ? "" : field.value}
                onValueChange={(v) => {
                  if (!v) return;
                  setTypeIcon(false);
                  clearErrors("icon");
                  field.onChange(v);
                }}
                aria-label="Icon"
                spacing={2}
                className="grid w-full grid-cols-8"
              >
                {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
                  <ToggleGroupItem
                    key={key}
                    value={key}
                    variant="outline"
                    aria-label={key}
                    className="aspect-square h-auto min-h-10 rounded-full px-0 data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
                  >
                    <Icon className="size-5" weight={field.value === key ? "fill" : "regular"} />
                  </ToggleGroupItem>
                ))}
                {savedIcons.map((name) => (
                  <div key={name} className="relative">
                    <ToggleGroupItem
                      value={name}
                      variant="outline"
                      aria-label={name}
                      className="aspect-square h-auto min-h-10 w-full rounded-full px-0 data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
                    >
                      <PhosphorIcon name={name} className="size-5" weight={field.value === name ? "fill" : "regular"} />
                    </ToggleGroupItem>
                    <button
                      type="button"
                      aria-label={`Remove icon ${name}`}
                      onClick={() => setRemoving({ kind: "icon", value: name })}
                      className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-foreground text-background shadow-sm focus-visible:outline-3 focus-visible:outline-ring"
                    >
                      <XIcon className="size-3" weight="bold" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  aria-label="Type an icon name"
                  aria-pressed={typeIcon}
                  onClick={() => {
                    setTypeIcon(true);
                    if (field.value in CATEGORY_ICONS) field.onChange("");
                  }}
                  className={cn(
                    "grid aspect-square min-h-10 place-items-center rounded-full border border-dashed text-muted-foreground focus-visible:outline-3 focus-visible:outline-ring",
                    typeIcon && "border-primary border-solid bg-accent text-accent-foreground",
                  )}
                >
                  <PlusIcon className="size-5" weight="bold" />
                </button>
              </ToggleGroup>
              {typeIcon && (
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Phosphor icon name"
                    placeholder="coffee"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={field.value in CATEGORY_ICONS ? "" : field.value}
                    onChange={(e) => {
                      clearErrors("icon");
                      field.onChange(e.target.value);
                    }}
                    aria-invalid={!!errors.icon || undefined}
                  />
                  <Button
                    type="button"
                    className="h-11 shrink-0 rounded-full px-4 font-bold"
                    onClick={async () => {
                      const name = field.value.trim();
                      if (!name || name in CATEGORY_ICONS) return;
                      if (!(await loadIcon(name))) {
                        setError("icon", { message: `No Phosphor icon is called "${name}"` });
                        return;
                      }
                      addSavedIcon(name);
                      field.onChange(name);
                      setTypeIcon(false);
                    }}
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>
          )}
        />
      </Field>

      <Field
        label="Color"
        error={errors.color?.message}
      >
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <div className="grid gap-3">
              <ToggleGroup
                type="single"
                value={typeColor ? "" : field.value}
                onValueChange={(v) => {
                  if (!v) return;
                  setTypeColor(false);
                  clearErrors("color");
                  field.onChange(v);
                }}
                aria-label="Color"
                spacing={3}
                className="flex-wrap"
              >
                {Object.entries(CATEGORY_COLORS).map(([key, c]) => (
                  <ToggleGroupItem
                    key={key}
                    value={key}
                    aria-label={key}
                    className="size-11 rounded-full p-0 ring-offset-2 ring-offset-popover hover:opacity-90 data-[state=on]:ring-2 data-[state=on]:ring-primary"
                    style={{ background: c.solid }}
                  >
                    {field.value === key && <CheckIcon className="size-5 text-white" weight="bold" />}
                  </ToggleGroupItem>
                ))}
                {savedColors.map((hex) => (
                  <div key={hex} className="relative">
                    <ToggleGroupItem
                      value={hex}
                      aria-label={`Color ${hex}`}
                      className="size-11 rounded-full p-0 ring-offset-2 ring-offset-popover hover:opacity-90 data-[state=on]:ring-2 data-[state=on]:ring-primary"
                      style={{ background: hex }}
                    >
                      {field.value === hex && <CheckIcon className="size-5 text-white mix-blend-difference" weight="bold" />}
                    </ToggleGroupItem>
                    <button
                      type="button"
                      aria-label={`Remove color ${hex}`}
                      onClick={() => setRemoving({ kind: "color", value: hex })}
                      className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-foreground text-background shadow-sm focus-visible:outline-3 focus-visible:outline-ring"
                    >
                      <XIcon className="size-3" weight="bold" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  aria-label="Type a hex color"
                  aria-pressed={typeColor}
                  onClick={() => {
                    setTypeColor(true);
                    if (field.value in CATEGORY_COLORS) field.onChange("");
                  }}
                  className={cn(
                    "grid size-11 place-items-center rounded-full border border-dashed text-muted-foreground focus-visible:outline-3 focus-visible:outline-ring",
                    typeColor && "border-primary border-solid bg-accent text-accent-foreground",
                  )}
                >
                  <PlusIcon className="size-5" weight="bold" />
                </button>
              </ToggleGroup>
              {typeColor && (
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="size-11 shrink-0 rounded-full border"
                    style={{ background: normalizeHex(field.value) ?? "transparent" }}
                  />
                  <Input
                    aria-label="Hex color"
                    placeholder="#ff6600"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={7}
                    value={field.value in CATEGORY_COLORS ? "" : field.value}
                    onChange={(e) => {
                      clearErrors("color");
                      field.onChange(e.target.value);
                    }}
                    aria-invalid={!!errors.color || undefined}
                  />
                  <Button
                    type="button"
                    className="h-11 shrink-0 rounded-full px-4 font-bold"
                    onClick={() => {
                      const hex = normalizeHex(field.value);
                      if (!hex) {
                        setError("color", { message: "Use a hex color like #ff6600" });
                        return;
                      }
                      addSavedCategoryColor(hex);
                      field.onChange(hex);
                      setTypeColor(false);
                    }}
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>
          )}
        />
      </Field>

      <div className="mt-1 flex gap-2">
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            className="h-12 w-12 rounded-full"
            onClick={onDelete}
            aria-label="Delete category"
          >
            <TrashIcon className="size-5" />
          </Button>
        )}
        <Button type="submit" className="h-12 flex-1 rounded-full text-base font-bold">
          {category ? "Save changes" : "Add category"}
        </Button>
      </div>
    </form>

    <ConfirmDialog
      open={removing !== null}
      onOpenChange={(o) => !o && setRemoving(null)}
      title={removing?.kind === "icon" ? `Remove icon "${removing.value}"?` : `Remove color ${removing?.value ?? ""}?`}
      description="It leaves this list. Categories that already use it keep it."
      confirmLabel="Remove"
      onConfirm={() => {
        if (!removing) return;
        if (removing.kind === "icon") removeSavedIcon(removing.value);
        else removeSavedCategoryColor(removing.value);
        toast.success("Removed");
      }}
    />
    </>
  );
}
