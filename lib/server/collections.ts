import "server-only";
import * as yup from "yup";
import { Types } from "mongoose";
import { Bill, Budget, Category, Pocket, Transaction } from "./models";

const id = yup.string().matches(/^[\w-]{1,64}$/, "Bad id").required();
const date = yup.string().matches(/^\d{4}-\d{2}-\d{2}$/, "Dates look like 2026-11-24").required();
const optionalId = yup.string().matches(/^[\w-]{1,64}$/).optional();
const wholeMoney = (min: number) => yup.number().integer().min(min).max(1e13).required();

/** What the server accepts for each collection. Unknown fields are dropped. */
const defs = {
  pockets: yup.object({
    id,
    name: yup.string().trim().min(1).max(40).required(),
    kind: yup.string().oneOf(["cash", "bank", "ewallet", "asset"]).required(),
    openingBalance: wholeMoney(0),
    holding: yup.string().max(60).optional(),
  }),
  categories: yup.object({
    id,
    name: yup.string().trim().min(1).max(40).required(),
    icon: yup.string().max(30).required(),
    color: yup.string().max(20).required(),
  }),
  transactions: yup.object({
    id,
    type: yup.string().oneOf(["expense", "income", "transfer"]).required(),
    amount: wholeMoney(1),
    pocketId: id,
    toPocketId: optionalId,
    categoryId: optionalId,
    date,
    note: yup.string().max(500).default(""),
  }),
  budgets: yup.object({
    id,
    name: yup.string().trim().min(1).max(60).required(),
    startDate: date,
    endDate: date,
    total: wholeMoney(1),
    allocations: yup
      .array()
      .of(yup.object({ categoryId: id, amount: wholeMoney(1) }))
      .max(100)
      .default([]),
  }),
  bills: yup.object({
    id,
    name: yup.string().trim().min(1).max(60).required(),
    dueDate: date,
    amount: yup.number().integer().min(0).max(1e13).optional(),
    repeat: yup.string().oneOf(["once", "monthly"]).required(),
    remindDays: yup.array().of(yup.number().oneOf([0, 1, 3, 7]).required()).min(1).max(4).required(),
    paid: yup.boolean().optional(),
  }),
};

export type CollectionName = keyof typeof defs;
// Widened so TypeScript does not expand five big inferred schema types everywhere.
export const SCHEMAS = defs as unknown as Record<CollectionName, yup.AnyObjectSchema>;

// Loosely typed on purpose: each model has its own shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MODELS: Record<CollectionName, any> = {
  pockets: Pocket,
  categories: Category,
  transactions: Transaction,
  budgets: Budget,
  bills: Bill,
};

export const NAMES = Object.keys(SCHEMAS) as CollectionName[];
export const isCollection = (s: string): s is CollectionName => s in SCHEMAS;

export async function validate(name: CollectionName, value: unknown): Promise<Record<string, unknown>> {
  return (await SCHEMAS[name].validate(value, { stripUnknown: true, abortEarly: true })) as Record<string, unknown>;
}

/** Remove database-only fields before sending a record to the app. */
export function publicDoc(doc: Record<string, unknown>) {
  const { _id, userId, ...rest } = doc;
  void _id;
  void userId;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== null && v !== undefined));
}

export const oid = (s: string) => new Types.ObjectId(s);
