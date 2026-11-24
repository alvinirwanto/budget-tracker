"use client";

import { Controller, useFieldArray, useForm, type Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { PlusIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategorySelect } from "@/components/category-select";
import { DatePicker } from "@/components/date-picker";
import { Field, MoneyInput } from "@/components/fields";
import { findOverlap, makeBudgetSchema, type BudgetValues } from "@/lib/schemas";
import { actions, useAppState } from "@/lib/store";
import { ISO, formatIDR, todayISO } from "@/lib/format";
import { addDays, format, parseISO } from "date-fns";
import { useMemo } from "react";
import type { Budget } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Today, or the first day after any budget that already covers it. */
function firstFreeDay(from: string, others: { startDate: string; endDate: string }[]) {
  let day = from;
  for (let i = 0; i < 50; i++) {
    const hit = others.find((o) => day >= o.startDate && day <= o.endDate);
    if (!hit) return day;
    day = format(addDays(parseISO(hit.endDate), 1), ISO);
  }
  return day;
}

export function BudgetForm({
  budget,
  onDone,
  onDelete,
}: {
  budget?: Budget;
  onDone: (id: string) => void;
  onDelete?: () => void;
}) {
  const { categories, budgets } = useAppState();
  const others = useMemo(() => budgets.filter((b) => b.id !== budget?.id), [budgets, budget?.id]);
  const schema = useMemo(() => makeBudgetSchema(others), [others]);
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BudgetValues>({
    resolver: yupResolver(schema) as Resolver<BudgetValues>,
    defaultValues: {
      name: budget?.name ?? "",
      startDate: budget?.startDate ?? firstFreeDay(todayISO(), others),
      endDate: budget?.endDate ?? "",
      total: budget?.total,
      allocations: budget?.allocations ?? [],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "allocations" });

  const startValue = watch("startDate");
  const isTaken = (d: Date) => {
    const iso = format(d, ISO);
    return others.some((o) => iso >= o.startDate && iso <= o.endDate);
  };
  // An end date is blocked if it is before the start, or the range would swallow another budget.
  const endBlocked = (d: Date) => {
    const iso = format(d, ISO);
    return !!startValue && (iso < startValue || !!findOverlap(startValue, iso, others));
  };
  const total = watch("total") ?? 0;
  const rows = watch("allocations") ?? [];
  const allocated = rows.reduce((a, r) => a + (Number(r?.amount) || 0), 0);
  const left = total - allocated;
  const used = new Set(rows.map((r) => r?.categoryId));
  const unused = categories.filter((c) => !used.has(c.id));

  const onSubmit = handleSubmit((v) => {
    const id = actions.saveBudget({
      id: budget?.id,
      name: v.name,
      startDate: v.startDate,
      endDate: v.endDate,
      total: v.total,
      allocations: (v.allocations ?? []).map((a) => ({
        categoryId: a.categoryId,
        amount: a.amount,
      })),
    });
    toast.success(budget ? "Budget updated" : "Budget created");
    onDone(id);
  });

  const allocationsError =
    errors.allocations?.root?.message ?? (errors.allocations as { message?: string } | undefined)?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 pb-3">
      <Field label="Name" htmlFor="b-name" error={errors.name?.message}>
        <Input
          id="b-name"
          placeholder="e.g. January – February"
          autoComplete="off"
          {...register("name")}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="From" htmlFor="b-start" error={errors.startDate?.message}>
          <Controller
            control={control}
            name="startDate"
            render={({ field }) => (
              <DatePicker id="b-start" value={field.value} onChange={field.onChange} invalid={!!errors.startDate} disabled={isTaken} />
            )}
          />
        </Field>
        <Field label="Until" htmlFor="b-end" error={errors.endDate?.message}>
          <Controller
            control={control}
            name="endDate"
            render={({ field }) => (
              <DatePicker id="b-end" value={field.value} onChange={field.onChange} invalid={!!errors.endDate} disabled={endBlocked} />
            )}
          />
        </Field>
      </div>

      {others.length > 0 && (
        <p className="-mt-2 text-sm text-muted-foreground">
          Dates already in another budget are greyed out.
        </p>
      )}

      <Field label="Total budget" htmlFor="b-total" error={errors.total?.message}>
        <Controller
          control={control}
          name="total"
          render={({ field }) => (
            <MoneyInput
              id="b-total"
              hero
              value={field.value}
              onChange={field.onChange}
              invalid={!!errors.total}
            />
          )}
        />
      </Field>

      <section aria-labelledby="alloc-title" className="grid gap-3 rounded-2xl bg-muted/60 p-3">
        <div className="flex items-baseline justify-between gap-2 px-1">
          <h3 id="alloc-title" className="text-sm font-bold">
            Split by category
          </h3>
          <p
            className={cn(
              "money text-sm font-semibold",
              left < 0 ? "text-expense" : "text-muted-foreground",
            )}
            aria-live="polite"
          >
            {left < 0 ? "Over by " : "Left to plan "}
            {formatIDR(Math.abs(left))}
          </p>
        </div>

        {fields.map((f, i) => (
          <div key={f.id} className="grid gap-1">
            <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
              <Controller
                control={control}
                name={`allocations.${i}.categoryId`}
                render={({ field }) => (
                  <CategorySelect
                    value={field.value}
                    onChange={field.onChange}
                    hiddenIds={[...used].filter((x): x is string => !!x)}
                    placeholder="Category"
                    label={`Category ${i + 1}`}
                    className="w-full bg-card"
                  />
                )}
              />
              <Controller
                control={control}
                name={`allocations.${i}.amount`}
                render={({ field }) => (
                  <MoneyInput
                    className="bg-card"
                    value={field.value}
                    onChange={field.onChange}
                    invalid={!!errors.allocations?.[i]?.amount}
                  />
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                className="size-11 rounded-full"
                onClick={() => remove(i)}
                aria-label={`Remove category ${i + 1}`}
              >
                <XIcon className="size-4" />
              </Button>
            </div>
            {left !== 0 && total > 0 && (rows[i]?.categoryId ?? "") !== "" && (Number(rows[i]?.amount) || 0) + left > 0 && (
              <button
                type="button"
                className="justify-self-start rounded-full px-3 py-1 text-xs font-semibold text-primary hover:bg-accent focus-visible:outline-3 focus-visible:outline-ring"
                onClick={() =>
                  setValue(`allocations.${i}.amount`, (Number(rows[i]?.amount) || 0) + left, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                {left > 0 ? "Add the left " : "Take off the extra "}
                <span className="money">{formatIDR(Math.abs(left))}</span>
                {" here"}
              </button>
            )}
            {(errors.allocations?.[i]?.categoryId?.message || errors.allocations?.[i]?.amount?.message) && (
              <p role="alert" className="text-sm text-destructive">
                {errors.allocations?.[i]?.categoryId?.message ?? errors.allocations?.[i]?.amount?.message}
              </p>
            )}
          </div>
        ))}

        {allocationsError && (
          <p role="alert" className="text-sm text-destructive">
            {allocationsError}
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full bg-card"
          disabled={unused.length === 0}
          onClick={() => append({ categoryId: unused[0]?.id ?? "", amount: undefined as unknown as number })}
        >
          <PlusIcon className="size-4" />
          {unused.length === 0 && categories.length > 0 ? "All categories used" : "Add category"}
        </Button>
      </section>

      <div className="mt-1 flex gap-2">
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            className="h-12 w-12 rounded-full"
            onClick={onDelete}
            aria-label="Delete budget"
          >
            <TrashIcon className="size-5" />
          </Button>
        )}
        <Button type="submit" className="h-12 flex-1 rounded-full text-base font-bold">
          {budget ? "Save changes" : "Create budget"}
        </Button>
      </div>
    </form>
  );
}
