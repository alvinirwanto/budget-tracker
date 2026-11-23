import * as yup from "yup";
import { body, handler, json, requireUser } from "@/lib/server/api";
import { User } from "@/lib/server/models";

/** Remember which notifications the user has read. */
export const PUT = handler(async (req) => {
  const userId = await requireUser();
  const { seen } = await yup
    .object({ seen: yup.array().of(yup.string().max(200).required()).max(2000).required() })
    .validate(await body(req), { stripUnknown: true });
  await User.updateOne({ _id: userId }, { seen });
  return json({ ok: true });
}, { write: true });
