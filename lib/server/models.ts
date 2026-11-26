import "server-only";
import mongoose, { Schema } from "mongoose";

/* The models are used loosely on purpose: the shapes are checked by the yup schemas in collections.ts. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = mongoose.Model<any>;

/**
 * Every record belongs to one user (userId) and keeps the id the app made for it
 * (id), so the screens work with the same ids they always did.
 */
const base = { userId: { type: Schema.Types.ObjectId, required: true, index: true }, id: { type: String, required: true } };

function make(name: string, fields: Record<string, unknown>): AnyModel {
  const schema = new Schema({ ...base, ...fields } as never, { versionKey: false });
  schema.index({ userId: 1, id: 1 }, { unique: true });
  return (mongoose.models[name] as AnyModel) || mongoose.model(name, schema);
}

const userSchema = new Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    /** Notification keys this user has already seen. */
    seen: { type: [String], default: [] },
    /** Accent color and the icons/colors the user saved in the pickers. */
    prefs: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);
export const User: AnyModel = (mongoose.models.User as AnyModel) || mongoose.model("User", userSchema as never);

export const Pocket = make("Pocket", {
  name: String,
  kind: String,
  openingBalance: Number,
  holding: String,
});
export const Category = make("Category", { name: String, icon: String, color: String });
export const Transaction = make("Transaction", {
  type: String,
  amount: Number,
  pocketId: String,
  toPocketId: String,
  categoryId: String,
  date: String,
  note: String,
});
export const Budget = make("Budget", {
  name: String,
  startDate: String,
  endDate: String,
  total: Number,
  allocations: [{ _id: false, categoryId: String, amount: Number }],
});
export const Bill = make("Bill", {
  name: String,
  dueDate: String,
  amount: Number,
  repeat: String,
  remindDays: [Number],
  paid: Boolean,
});
