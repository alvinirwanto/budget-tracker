import { format, parseISO } from "date-fns";
import * as yup from "yup";

const money = (label: string) =>
  yup
    .number()
    .typeError(`${label} must be a number`)
    .integer(`${label} must be a whole number`)
    .moreThan(0, `${label} must be more than 0`)
    .required(`${label} is required`);

export const transactionSchema = yup.object({
  type: yup.string().oneOf(["expense", "income", "transfer"]).required(),
  amount: money("Amount"),
  pocketId: yup.string().required("Choose a pocket"),
  toPocketId: yup.string().when("type", {
    is: "transfer",
    then: (s) =>
      s
        .required("Choose a destination pocket")
        .test("different", "Pick a different pocket", (v, ctx) => v !== ctx.parent.pocketId),
    otherwise: (s) => s.optional(),
  }),
  categoryId: yup.string().when("type", {
    is: "expense",
    then: (s) => s.required("Choose a category"),
    otherwise: (s) => s.optional(),
  }),
  date: yup.string().required("Pick a date"),
  note: yup.string().max(500, "Keep it under 500 characters").default(""),
});
export type TransactionValues = yup.InferType<typeof transactionSchema>;

export const pocketSchema = yup.object({
  name: yup.string().trim().required("Give the pocket a name").max(24, "Max 24 characters"),
  kind: yup.string().oneOf(["cash", "bank", "ewallet", "asset"]).required(),
  openingBalance: yup
    .number()
    .typeError("Enter a number")
    .integer("Whole rupiah only")
    .min(0, "Can't be negative")
    .required("Enter a starting amount"),
  holding: yup.string().max(30, "Max 30 characters").default(""),
});
export type PocketValues = yup.InferType<typeof pocketSchema>;

export const categorySchema = yup.object({
  name: yup.string().trim().required("Give the category a name").max(24, "Max 24 characters"),
  icon: yup.string().required(),
  color: yup.string().required(),
});
export type CategoryValues = yup.InferType<typeof categorySchema>;

export interface BudgetRange {
  name: string;
  startDate: string;
  endDate: string;
}

/** First budget in `others` whose dates touch start..end, if any. */
export function findOverlap(start: string, end: string, others: BudgetRange[]) {
  return others.find((o) => start <= o.endDate && end >= o.startDate);
}

export const makeBudgetSchema = (others: BudgetRange[]) => yup.object({
  name: yup.string().trim().required("Give the budget a name").max(30, "Max 30 characters"),
  startDate: yup.string().required("Pick a start date"),
  endDate: yup
    .string()
    .required("Pick an end date")
    .test("after", "End date must be on or after the start", (v, ctx) =>
      v && ctx.parent.startDate ? v >= ctx.parent.startDate : true,
    )
    .test("overlap", (v, ctx) => {
      const start = ctx.parent.startDate as string | undefined;
      if (!v || !start || v < start) return true;
      const hit = findOverlap(start, v, others);
      return hit
        ? ctx.createError({ message: `These dates overlap "${hit.name}" (${format(parseISO(hit.startDate), "d MMM")} – ${format(parseISO(hit.endDate), "d MMM yyyy")})` })
        : true;
    }),
  total: money("Budget"),
  allocations: yup
    .array()
    .of(
      yup.object({
        categoryId: yup.string().required("Choose a category"),
        amount: money("Amount"),
      }),
    )
    .default([])
    .test("unique", "Each category can only be used once", (rows) => {
      const ids = (rows ?? []).map((r) => r.categoryId).filter(Boolean);
      return new Set(ids).size === ids.length;
    }),
});
export const budgetSchema = makeBudgetSchema([]);
export type BudgetValues = yup.InferType<typeof budgetSchema>;

export const billSchema = yup.object({
  name: yup.string().trim().required("Give the bill a name").max(40, "Max 40 characters"),
  dueDate: yup.string().required("Pick the due date"),
  amount: yup
    .number()
    .transform((v, orig) => (orig === "" || orig === null || Number.isNaN(v) ? undefined : v))
    .integer("Whole rupiah only")
    .min(0, "Can't be negative")
    .optional(),
  repeat: yup.string().oneOf(["once", "monthly"]).required(),
  remindDays: yup
    .array()
    .of(yup.number().oneOf([0, 1, 3, 7]).required())
    .min(1, "Pick at least one reminder")
    .required("Pick at least one reminder"),
});
export type BillValues = yup.InferType<typeof billSchema>;
