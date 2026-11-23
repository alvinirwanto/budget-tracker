"use client";

import { Controller, useForm, type Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { CheckIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Field } from "@/components/fields";
import { CategoryBadge } from "@/components/visuals";
import { categorySchema, type CategoryValues } from "@/lib/schemas";
import { actions } from "@/lib/store";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/icons";
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

  const onSubmit = handleSubmit((v) => {
    const id = actions.saveCategory({ id: category?.id, ...v });
    toast.success(category ? "Category updated" : "Category added");
    onDone(id);
  });

  return (
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

      <Field label="Icon">
        <Controller
          control={control}
          name="icon"
          render={({ field }) => (
            <ToggleGroup
              type="single"
              value={field.value}
              onValueChange={(v) => v && field.onChange(v)}
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
                  className="aspect-square h-auto min-h-10 rounded-xl px-0 data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
                >
                  <Icon className="size-5" weight={field.value === key ? "fill" : "regular"} />
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        />
      </Field>

      <Field label="Color">
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <ToggleGroup
              type="single"
              value={field.value}
              onValueChange={(v) => v && field.onChange(v)}
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
            </ToggleGroup>
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
  );
}
