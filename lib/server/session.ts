import "server-only";
import { cookies } from "next/headers";
import { COOKIE, SESSION_DAYS, signToken, verifyToken } from "./token";

export async function startSession(userId: string) {
  const store = await cookies();
  store.set(COOKIE, await signToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUserId(): Promise<string | null> {
  return verifyToken((await cookies()).get(COOKIE)?.value);
}
