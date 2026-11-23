import "server-only";
import { DEFAULT_CATEGORIES, DEFAULT_POCKETS } from "../defaults";
import { MODELS, NAMES, oid, publicDoc, type CollectionName } from "./collections";
import { User } from "./models";

export type Everything = Record<CollectionName, Record<string, unknown>[]> & { seen: string[] };

/** All of one user's data, shaped like the app's state. */
export async function loadAll(userId: string) {
  const user = await User.findById(userId).lean();
  if (!user) return null;
  const uid = oid(userId);
  const lists = await Promise.all(NAMES.map((n) => MODELS[n].find({ userId: uid }).lean()));
  const out: Record<string, unknown> = {
    user: { name: user.name, email: user.email },
    seen: user.seen ?? [],
  };
  NAMES.forEach((n, i) => {
    out[n] = (lists[i] as Record<string, unknown>[]).map(publicDoc);
  });
  return out;
}

/** Throw away what the user has and store the given data instead. */
export async function replaceAll(userId: string, data: Partial<Everything>) {
  const uid = oid(userId);
  for (const n of NAMES) {
    await MODELS[n].deleteMany({ userId: uid });
    const rows = data[n] ?? [];
    if (rows.length) await MODELS[n].insertMany(rows.map((r) => ({ ...r, userId: uid })));
  }
  if (data.seen) await User.updateOne({ _id: uid }, { seen: data.seen });
}

export async function seedDefaults(userId: string) {
  await replaceAll(userId, {
    categories: DEFAULT_CATEGORIES as unknown as Record<string, unknown>[],
    pockets: DEFAULT_POCKETS as unknown as Record<string, unknown>[],
  });
}
