import { handler, json } from "@/lib/server/api";
import { endSession } from "@/lib/server/session";

export const POST = handler(async () => {
  await endSession();
  return json({ ok: true });
}, { write: true });
