import bcrypt from "bcryptjs";
import * as yup from "yup";
import { body, handler, HttpError, json } from "@/lib/server/api";
import { User } from "@/lib/server/models";
import { startSession } from "@/lib/server/session";

const schema = yup.object({
  email: yup.string().trim().lowercase().email().max(120).required(),
  password: yup.string().max(72).required(),
});

// A real hash to compare against when the email is unknown, so timing does not give it away.
const DUMMY = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.2oF9JrN3FqJxZ6k8ZJ1B8y1YpWm2";

// Best-effort brake on guessing: 8 tries per email and address every 15 minutes (per server instance).
const tries = new Map<string, { n: number; reset: number }>();
const WINDOW = 15 * 60 * 1000;

export const POST = handler(async (req) => {
  const raw = await body(req);
  const parsed = await schema.validate(raw, { stripUnknown: true }).catch(() => null);
  if (!parsed) throw new HttpError(400, "Enter your email and password.");

  const key = `${req.headers.get("x-forwarded-for") ?? "local"}|${parsed.email}`;
  const now = Date.now();
  const entry = tries.get(key);
  if (entry && entry.reset > now && entry.n >= 8) {
    throw new HttpError(429, "Too many tries. Wait a few minutes and try again.");
  }

  const user = await User.findOne({ email: parsed.email });
  const ok = await bcrypt.compare(parsed.password, user?.passwordHash ?? DUMMY);
  if (!user || !ok) {
    tries.set(key, { n: (entry && entry.reset > now ? entry.n : 0) + 1, reset: entry && entry.reset > now ? entry.reset : now + WINDOW });
    throw new HttpError(401, "Wrong email or password.");
  }
  tries.delete(key);
  await startSession(String(user._id));
  return json({ user: { name: user.name, email: user.email } });
}, { write: true });
