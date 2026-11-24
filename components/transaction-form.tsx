"use client";

import { Controller, useForm, type Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { TrashIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CategorySelect } from "@/components/category-select";
import { DatePicker } from "@/components/date-picker";
import { Segmented } from "@/components/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, MoneyInput } from "@/components/fields";
import { transactionSchema, type TransactionValues } from "@/lib/schemas";
import { actions, useAppState } from "@/lib/store";
import { balanceOf, categoryBudgetStatus } from "@/lib/stats";
import { formatIDR, todayISO } from "@/lib/format";
import type { Transaction, TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPES: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Move" },
];

export function TransactionForm({
  transaction,
  defaultType = "expense",
  defaultDate,
  onDone,
  onDelete,
}: {
  transaction?: Transaction;
  defaultType?: TransactionType;
  defaultDate?: string;
  onDone: () => void;
  onDelete?: () => void;
}) {
  const state = useAppState();
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TransactionValues>({
    resolver: yupResolver(transactionSchema) as Resolver<TransactionValues>,
    defaultValues: transaction
      ? {
          type: transaction.type,
          amount: transaction.amount,
          pocketId: transaction.pocketId,
          toPocketId: transaction.toPocketId ?? "",
          categoryId: transaction.categoryId ?? "",
          date: transaction.date,
          note: transaction.note,
        }
      : {
          type: defaultType,
          amount: undefined,
          pocketId: state.pockets[0]?.id ?? "",
          toPocketId: "",
          categoryId: "",
          date: defaultDate ?? todayISO(),
          note: "",
        },
  });

  const type = watch("type");
  const pocketId = watch("pocketId");
  const amount = watch("amount");
  const categoryId = watch("categoryId");
  const date = watch("date");
  const budgetHints =
    type === "expense" && categoryId && date
      ? categoryBudgetStatus(state.budgets, state.transactions, categoryId, date, transaction?.id)
      : [];
  const pocket = state.pockets.find((p) => p.id === pocketId);
  const available = pocket ? balanceOf(pocket, state.transactions, transaction?.id) : 0;

  const onSubmit = handleSubmit((values) => {
    if (values.type !== "income" && values.amount > available) {
      setError("amount", {
        message: `Only ${formatIDR(available)} left in ${pocket?.name ?? "this pocket"}`,
      });
      return;
    }
    actions.saveTransaction({
      id: transaction?.id,
      type: values.type as TransactionType,
      amount: values.amount,
      pocketId: values.pocketId,
      toPocketId: values.type === "transfer" ? values.toPocketId : undefined,
      categoryId: values.type === "expense" ? values.categoryId : undefined,
      date: values.date,
      note: values.note ?? "",
    });
    toast.success(transaction ? "Changes saved" : values.type === "income" ? "Income added" : "Saved");
    onDone();
  });

  const pocketLabel = type === "income" ? "Put into" : type === "transfer" ? "Move from" : "Paid from";

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 pb-3">
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <Segmented
            label="Transaction type"
            value={field.value as TransactionType}
            options={TYPES}
            onChange={(v) => {
              field.onChange(v);
              setValue("categoryId", "", { shouldValidate: false });
            }}
            className="bg-background"
          />
        )}
      />

      <Field label="Amount" htmlFor="tx-amount" error={errors.amount?.message}>
        <Controller
          control={control}
          name="amount"
          render={({ field }) => (
            <MoneyInput
              id="tx-amount"
              hero
              value={field.value}
              onChange={field.onChange}
              invalid={!!errors.amount}
            />
          )}
        />
      </Field>

      <Field
        label={pocketLabel}
        error={errors.pocketId?.message}
        hint={
          pocket && type !== "income" ? (
            <>
              Available <span className="money font-semibold">{formatIDR(available)}</span>
              {amount && amount > available ? " — not enough" : ""}
            </>
          ) : undefined
        }
      >
        <Controller
          control={control}
          name="pocketId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full" aria-label={pocketLabel}>
                <SelectValue placeholder="Choose a pocket" />
              </SelectTrigger>
              <SelectContent>
                {state.pockets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      {type === "transfer" && (
        <Field label="Move to" error={errors.toPocketId?.message}>
          <Controller
            control={control}
            name="toPocketId"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger className="w-full" aria-label="Move to">
                  <SelectValue placeholder="Choose a pocket" />
                </SelectTrigger>
                <SelectContent>
                  {state.pockets
                    .filter((p) => p.id !== pocketId)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      )}

      {type === "expense" && (
        <Field label="Category" error={errors.categoryId?.message}>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <CategorySelect
                value={field.value}
                onChange={(id) => field.onChange(id)}
              />
            )}
          />
        </Field>
      )}

      {budgetHints.length > 0 && (
        <ul className="grid gap-2" aria-live="polite">
          {budgetHints.map(({ budget, left }) => {
            const after = left - (amount || 0);
            const over = after < 0;
            return (
              <li
                key={budget.id}
                className={cn(
                  "rounded-xl px-4 py-3 text-sm leading-relaxed",
                  over ? "bg-expense/10 text-expense" : "bg-accent text-accent-foreground",
                )}
              >
                <span className="font-semibold">{budget.name}</span> budget:{" "}
                <span className="money font-bold">{formatIDR(left)}</span> left for this category
                {amount ? (
                  <>
                    {" "}
                    <ArrowRightIcon aria-hidden className="inline size-3.5 align-[-2px]" weight="bold" />{" "}
                    <span className="money font-bold">{over ? `over by ${formatIDR(-after)}` : `${formatIDR(after)} left after this`}</span>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <Field label="Date" htmlFor="tx-date" error={errors.date?.message}>
        <Controller
          control={control}
          name="date"
          render={({ field }) => (
            <DatePicker id="tx-date" value={field.value} onChange={field.onChange} invalid={!!errors.date} />
          )}
        />
      </Field>

      <Field label="Note" htmlFor="tx-note" error={errors.note?.message}>
        <Textarea
          id="tx-note"
          rows={7}
          placeholder="Optional. Add details like where, who or why."
          className="resize-none"
          {...register("note")}
        />
      </Field>

      <div className="mt-1 flex gap-2">
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            className="h-12 w-12 rounded-full"
            onClick={onDelete}
            aria-label="Delete transaction"
          >
            <TrashIcon className="size-5" />
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 flex-1 rounded-full text-base font-bold"
        >
          {transaction ? "Save changes" : "Add transaction"}
        </Button>
      </div>
    </form>
  );
}
