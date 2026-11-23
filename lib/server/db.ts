import "server-only";
import mongoose from "mongoose";
import { dbName, mongoUri } from "./env";

/**
 * One connection per server instance. In dev (hot reload) and on Vercel (warm
 * serverless functions) the promise is kept on globalThis so we do not open a
 * new connection for every request.
 */
const cache = globalThis as unknown as { __mongoose?: { promise: Promise<typeof mongoose> | null } };
cache.__mongoose ??= { promise: null };

export async function connectDB() {
  const holder = cache.__mongoose!;
  holder.promise ??= mongoose
    .connect(mongoUri(), {
      dbName: dbName(),
      bufferCommands: false,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
    })
    .catch((err) => {
      holder.promise = null; // let the next request try again
      throw err;
    });
  return holder.promise;
}
