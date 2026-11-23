"use client";

import { Controller, useForm, type Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Field, MoneyInput } from "@/components/fields";
import { pocketSchema, type PocketValues } from "@/lib/schemas";
import { actions } from "@/lib/store";
import { POCKET_ICONS, POCKET_LABELS } from "@/lib/icons";
import type { Pocket, PocketKind } from "@/lib/types";

export function PocketForm({
  pocket,
  onDone,
  onDelete,
}: {
  pocket?: Pocket;
  onDone: () => void;
  onDelete?: () => void;
}) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PocketValues>({
    resolver: yupResolver(pocketSchema) as Resolver<PocketValues>,
    defaultValues: {
      name: pocket?.name ?? "",
      kind: pocket?.kind ?? "cash",
      openingBalance: pocket?.openingBalance,
      holding: pocket?.holding ?? "",
    },
  });
  const kind = watch("kind") as PocketKind;

  const onSubmit = handleSubmit((v) => {
    actions.savePocket({
      id: pocket?.id,
      name: v.name,
      kind: v.kind as PocketKind,
      openingBalance: v.openingBalance,
      holding: v.kind === "asset" ? v.holding || undefined : undefined,
    });
    toast.success(pocket ? "Pocket updated" : "Pocket added");
    onDone();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 pb-3">
      <Field label="Name" htmlFor="pocket-name" error={errors.name?.message}>
        <Input
          id="pocket-name"
          placeholder={kind === "asset" ? "Gold" : "Wallet"}
          autoComplete="off"
          {...register("name")}
        />
      </Field>

      <Field label="Type">
        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <ToggleGroup
              type="single"
              value={field.value}
              onValueChange={(v) => v && field.onChange(v)}
              aria-label="Pocket type"
              spacing={2}
              className="grid w-full grid-cols-4"
            >
              {(Object.keys(POCKET_LABELS) as PocketKind[]).map((k) => {
                const Icon = POCKET_ICONS[k];
                return (
                  <ToggleGroupItem
                    key={k}
                    value={k}
                    variant="outline"
                    className="h-16 flex-col gap-1 rounded-2xl px-1 text-xs font-semibold data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
                  >
                    <Icon className="size-5" weight={field.value === k ? "fill" : "regular"} />
                    {POCKET_LABELS[k]}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          )}
        />
      </Field>

      <Field
        label={kind === "asset" ? "Current value" : "Starting balance"}
        htmlFor="pocket-balance"
        error={errors.openingBalance?.message}
        hint={
          kind === "asset"
            ? "What it is worth in rupiah today. Spend from it any time you sell some."
            : "How much is in it right now."
        }
      >
        <Controller
          control={control}
          name="openingBalance"
          render={({ field }) => (
            <MoneyInput
              id="pocket-balance"
              value={field.value}
              onChange={field.onChange}
              invalid={!!errors.openingBalance}
            />
          )}
        />
      </Field>

      {kind === "asset" && (
        <Field label="How much you hold" htmlFor="pocket-holding" error={errors.holding?.message}>
          <Input
            id="pocket-holding"
            placeholder="e.g. 10 gram"
            autoComplete="off"
            {...register("holding")}
          />
        </Field>
      )}

      <div className="mt-1 flex gap-2">
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            className="h-12 w-12 rounded-full"
            onClick={onDelete}
            aria-label="Delete pocket"
          >
            <TrashIcon className="size-5" />
          </Button>
        )}
        <Button type="submit" className="h-12 flex-1 rounded-full text-base font-bold">
          {pocket ? "Save changes" : "Add pocket"}
        </Button>
      </div>
    </form>
  );
}
