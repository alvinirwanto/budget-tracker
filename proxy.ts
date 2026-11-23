import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifyToken } from "@/lib/server/token";

const PUBLIC = ["/login", "/register"];

/**
 * Optimistic check only: is there a valid login cookie? Real checks happen in
 * the API, which looks the user up for every request.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const userId = await verifyToken(request.cookies.get(COOKIE)?.value);
  const isPublic = PUBLIC.includes(pathname);

  if (!userId && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (userId && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Skip the API, Next internals and the files a browser needs before it can log in (PWA files, icons).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|icons|manifest.webmanifest|sw.js|offline.html).*)"],
};
