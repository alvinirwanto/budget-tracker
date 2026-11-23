import "server-only";
import { NextResponse } from "next/server";
import { ValidationError } from "yup";
import { connectDB } from "./db";
import { currentUserId } from "./session";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const json = (data: unknown, init?: number | ResponseInit) =>
  NextResponse.json(data, typeof init === "number" ? { status: init } : init);

/**
 * Wraps a handler: connects to the database, turns thrown errors into JSON
 * responses, and (for writes) refuses requests that are not same-site JSON.
 */
export function handler<Ctx = unknown>(
  fn: (req: Request, ctx: Ctx) => Promise<Response>,
  opts: { write?: boolean } = {},
) {
  return async (req: Request, ctx: Ctx) => {
    try {
      if (opts.write) assertSameSiteJson(req);
      await connectDB();
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      if (err instanceof ValidationError) return json({ error: err.errors[0] ?? "Invalid data" }, 400);
      console.error("[api]", err);
      return json({ error: "Something went wrong on the server." }, 500);
    }
  };
}

function assertSameSiteJson(req: Request) {
  if (!req.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "Send JSON.");
  }
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) {
    throw new HttpError(403, "Cross-site requests are not allowed.");
  }
}

export async function requireUser(): Promise<string> {
  const id = await currentUserId();
  if (!id) throw new HttpError(401, "Please log in.");
  return id;
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "That is not valid JSON.");
  }
}
