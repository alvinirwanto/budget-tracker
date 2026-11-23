import { body, handler, HttpError, json, requireUser } from "@/lib/server/api";
import { MODELS, isCollection, oid, validate } from "@/lib/server/collections";
import { Budget, Transaction } from "@/lib/server/models";

type Ctx = { params: Promise<{ collection: string; id: string }> };

async function target({ params }: Ctx) {
  const { collection, id } = await params;
  if (!isCollection(collection)) throw new HttpError(404, "Not found.");
  if (!/^[\w-]{1,64}$/.test(id)) throw new HttpError(400, "Bad id.");
  return { collection, id };
}

/** Create or update one record. */
export const PUT = handler<Ctx>(async (req, ctx) => {
  const userId = await requireUser();
  const { collection, id } = await target(ctx);
  const doc = await validate(collection, { ...(await body(req)), id });
  const { _id, userId: _u, ...fields } = doc as Record<string, unknown>;
  void _id;
  void _u;
  await MODELS[collection].replaceOne({ userId: oid(userId), id }, { ...fields, userId: oid(userId) }, { upsert: true });
  return json({ ok: true });
}, { write: true });

/** Delete one record, and tidy up what pointed at it. */
export const DELETE = handler<Ctx>(async (req, ctx) => {
  const userId = await requireUser();
  const { collection, id } = await target(ctx);
  const uid = oid(userId);

  if (collection === "pockets") {
    const used = await Transaction.exists({ userId: uid, $or: [{ pocketId: id }, { toPocketId: id }] });
    if (used) throw new HttpError(409, "This pocket still has transactions.");
  }
  if (collection === "categories") {
    await Transaction.updateMany({ userId: uid, categoryId: id }, { $unset: { categoryId: "" } });
    await Budget.updateMany({ userId: uid }, { $pull: { allocations: { categoryId: id } } });
  }
  await MODELS[collection].deleteOne({ userId: uid, id });
  return json({ ok: true });
}, { write: false });
