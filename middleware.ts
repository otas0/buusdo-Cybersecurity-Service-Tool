/**
 * Mainland China (CF-IPCountry=CN) → force redirect to GitHub Pages notice.
 * Opt out for ops/tests: ?china_workers_stay=1 (cookie, 8h) · clear with =0.
 * API and static assets are never redirected.
 */
import { NextResponse, type NextRequest } from "next/server";
import {
  CHINA_WORKERS_STAY_COOKIE,
  CHINA_WORKERS_STAY_PARAM,
  chinaPagesDestForWorkersPath,
  isChinaForceCountry,
  shouldSkipChinaWorkersRedirect
} from "./shared/china-workers-redirect";

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if (shouldSkipChinaWorkersRedirect(pathname)) {
    return NextResponse.next();
  }

  const stayParam = searchParams.get(CHINA_WORKERS_STAY_PARAM);
  if (stayParam === "1") {
    const res = NextResponse.next();
    res.cookies.set(CHINA_WORKERS_STAY_COOKIE, "1", {
      path: "/",
      maxAge: 60 * 60 * 8,
      sameSite: "lax"
    });
    return res;
  }
  if (stayParam === "0") {
    const res = NextResponse.next();
    res.cookies.set(CHINA_WORKERS_STAY_COOKIE, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax"
    });
    // Fall through — may still redirect if country is CN.
  } else if (req.cookies.get(CHINA_WORKERS_STAY_COOKIE)?.value === "1") {
    return NextResponse.next();
  }

  const country =
    req.headers.get("cf-ipcountry") ||
    req.headers.get("CF-IPCountry") ||
    req.headers.get("x-vercel-ip-country") ||
    "";

  if (!isChinaForceCountry(country)) {
    return NextResponse.next();
  }

  const dest = chinaPagesDestForWorkersPath(pathname);
  return NextResponse.redirect(dest, 302);
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next internals / common static prefixes.
     * Fine-grained skips also live in shouldSkipChinaWorkersRedirect.
     */
    "/((?!_next/static|_next/image|api/|favicon.ico|favicon.svg|favicon.png|robots.txt|sitemap.xml).*)"
  ]
};
