import "server-only";

export function env(name: "MONGODB_URI" | "AUTH_SECRET"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env.local (see .env.example) and to your Vercel environment variables.`,
    );
  }
  return value;
}

/**
 * The MongoDB connection string. Atlas hands out three values:
 * MONGODB_URI, MONGODB_USERNAME and MONGODB_PASSWORD.
 *  - If the URI already has the login in it, it is used as it is.
 *  - If it has a placeholder like <db_password>, or no login at all, the username and password are put in
 *    (and URL-encoded, so special characters in the password cannot break it).
 */
export function mongoUri(): string {
  let uri = env("MONGODB_URI").trim().replace(/^["']|["']$/g, "");
  const user = process.env.MONGODB_USERNAME;
  const pass = process.env.MONGODB_PASSWORD;
  if (user && pass) {
    const login = `${encodeURIComponent(user)}:${encodeURIComponent(pass)}`;
    if (/<(db_)?(username|user)>|<(db_)?password>/i.test(uri)) {
      uri = uri
        .replace(/<(db_)?(username|user)>/gi, encodeURIComponent(user))
        .replace(/<(db_)?password>/gi, encodeURIComponent(pass));
    } else if (!/^mongodb(\+srv)?:\/\/[^/]*@/i.test(uri)) {
      uri = uri.replace(/^(mongodb(?:\+srv)?:\/\/)/i, `$1${login}@`);
    }
  }
  return uri;
}

/** Which database inside the cluster holds this app's data. */
export const dbName = () => process.env.MONGODB_DB || "luar";
