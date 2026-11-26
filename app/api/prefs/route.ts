import * as yup from "yup";
import { body, handler, json, requireUser } from "@/lib/server/api";
import { User } from "@/lib/server/models";

const hex = yup.string().matches(/^#[0-9a-f]{6}$/i);
const list = (item: yup.StringSchema) => yup.array().of(item.required()).max(5000).default([]);

/** Save the look and picker choices (accent, saved colors, saved icons) to the account. */
export const PUT = handler(async (req) => {
  const userId = await requireUser();
  const prefs = await yup
    .object({
      accent: yup.string().matches(/^([a-z]{2,20}|#[0-9a-f]{6})$/i),
      accentSaved: list(hex),
      icons: list(yup.string().matches(/^[a-z0-9 _-]{2,30}$/i)),
      categoryColors: list(hex),
    })
    .validate(await body(req), { stripUnknown: true });
  await User.updateOne({ _id: userId }, { prefs });
  return json({ ok: true });
}, { write: true });
