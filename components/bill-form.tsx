"use client";

import { Controller, useForm, type Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DatePicker } from "@/components/date-picker";
import { Field, MoneyInput } from "@/components/fields";
import { Segmented } from "@/components/segmented";
import { billSchema, type BillValues } from "@/lib/schemas";
import { actions } from "@/lib/store";
import { todayISO } from "@/lib/format";
import type { Bill, BillRepeat } from "@/lib/types";

const REMIND = [
  { value: "7", label: "1 week before" },
  { value: "3", label: "3 days before" },
  { value: "1", label: "1 day before" },
  { value: "0", label: "On the day" },
];

export function BillForm({
  bill,
  onDone,
  onDelete,
}: {
  bill?: Bill;
  onDone: () => void;
  onDelete?: () => void;
}) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BillValues>({
    resolver: yupResolver(billSchema) as Resolver<BillValues>,
    defaultValues: {
      name: bill?.name ?? "",
      dueDate: bill?.dueDate ?? todayISO(),
      amount: bill?.amount,
      repeat: bill?.repeat ?? "monthly",
      remindDays: bill?.remindDays ?? [3],
    },
  });

  const onSubmit = handleSubmit((v) => {
    actions.saveBill({
      id: bill?.id,
      name: v.name,
      dueDate: v.dueDate,
      amount: v.amount || undefined,
      repeat: v.repeat as BillRepeat,
      remindDays: [...v.remindDays].sort((a, b) => b - a),
      paid: false,
    });
    toast.success(bill ? "Bill updated" : "Bill added");
    onDone();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 pb-3">
      <Field label="Bill name" htmlFor="bill-name" error={errors.name?.message}>
        <Input id="bill-name" placeholder="e.g. Electricity" autoComplete="off" {...register("name")} />
      </Field>

      <Field label="Due date" htmlFor="bill-date" error={errors.dueDate?.message}>
        <Controller
          control={control}
          name="dueDate"
          render={({ field }) => (
            <DatePicker id="bill-date" value={field.value} onChange={field.onChange} invalid={!!errors.dueDate} />
          )}
        />
      </Field>

      <Field label="Amount (optional)" htmlFor="bill-amount" error={errors.amount?.message}>
        <Controller
          control={control}
          name="amount"
          render={({ field }) => (
            <MoneyInput id="bill-amount" value={field.value} onChange={field.onChange} invalid={!!errors.amount} />
          )}
        />
      </Field>

      <Field label="Repeats">
        <Controller
          control={control}
          name="repeat"
          render={({ field }) => (
            <Segmented
              label="Repeats"
              value={field.value as BillRepeat}
              onChange={field.onChange}
              options={[
                { value: "monthly", label: "Every month" },
                { value: "once", label: "Just once" },
              ]}
            />
          )}
        />
      </Field>

      <Field label="Remind me" hint="Pick one or more. You get a reminder at each time." error={errors.remindDays?.message}>
        <Controller
          control={control}
          name="remindDays"
          render={({ field }) => (
            <ToggleGroup
              type="multiple"
              value={(field.value ?? []).map(String)}
              onValueChange={(v) => field.onChange(v.map(Number).sort((a, b) => b - a))}
              aria-label="Remind me"
              spacing={2}
              className="grid w-full grid-cols-2"
            >
              {REMIND.map((r) => (
                <ToggleGroupItem
                  key={r.value}
                  value={r.value}
                  variant="outline"
                  className="h-11 rounded-xl px-3 text-sm font-semibold data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
                >
                  {r.label}
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
            aria-label="Delete bill"
          >
            <TrashIcon className="size-5" />
          </Button>
        )}
        <Button type="submit" className="h-12 flex-1 rounded-full text-base font-bold">
          {bill ? "Save changes" : "Add bill"}
        </Button>
      </div>
    </form>
  );
}
