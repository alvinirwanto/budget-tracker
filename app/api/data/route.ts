import * as yup from "yup";
import { body, handler, HttpError, json, requireUser } from "@/lib/server/api";
import { NAMES, SCHEMAS, validate } from "@/lib/server/collections";
import { loadAll, replaceAll, type Everything } from "@/lib/server/data";

/** Everything the signed-in user has, in one request. The app loads this on start. */
export const GET = handler(async () => {
  const userId = await requireUser();
  const all = await loadAll(userId);
  if (!all) throw new HttpError(401, "Please log in.");
  return json(all, { headers: { "Cache-Control": "no-store" } });
});

const MAX_ROWS = 50_000;

/** Replace everything (used by import, erase and sample data). */
export const PUT = handler(async (req) => {
  const userId = await requireUser();
  const raw = (await body<Record<string, unknown>>(req)) ?? {};
  const data: Partial<Everything> = {};
  for (const name of NAMES) {
    const rows = raw[name];
    if (rows === undefined) {
      data[name] = [];
      continue;
    }
    if (!Array.isArray(rows) || rows.length > MAX_ROWS) throw new HttpError(400, `${name} is not a valid list.`);
    data[name] = await Promise.all(rows.map((r) => validate(name, r)));
  }
  data.seen = await yup.array().of(yup.string().max(200).required()).max(2000).default([]).validate(raw.seen);
  await replaceAll(userId, data);
  return json({ ok: true });
}, { write: true });

void SCHEMAS;
