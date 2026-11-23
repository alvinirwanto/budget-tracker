import bcrypt from "bcryptjs";
import * as yup from "yup";
import { body, handler, HttpError, json } from "@/lib/server/api";
import { seedDefaults } from "@/lib/server/data";
import { User } from "@/lib/server/models";
import { startSession } from "@/lib/server/session";

const schema = yup.object({
  name: yup.string().trim().max(60).default(""),
  email: yup.string().trim().lowercase().email("Enter a valid email").max(120).required("Email is required"),
  password: yup.string().min(8, "Password needs at least 8 characters").max(72, "Password is too long").required(),
});

export const POST = handler(async (req) => {
  const data = await schema.validate(await body(req), { stripUnknown: true });
  if (await User.exists({ email: data.email })) throw new HttpError(409, "That email already has an account.");

  let user;
  try {
    user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 10),
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) throw new HttpError(409, "That email already has an account.");
    throw err;
  }
  await seedDefaults(String(user._id));
  await startSession(String(user._id));
  return json({ user: { name: user.name, email: user.email } }, 201);
}, { write: true });
