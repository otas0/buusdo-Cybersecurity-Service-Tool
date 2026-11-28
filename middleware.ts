/**
 * Product decision (2026-11-28): no CF-country force redirect to China Pages.
 * Mainland users typically cannot reach *.workers.dev; country 302 only pollutes
 * reachable traffic. Stay cookie still honored for legacy ?china_workers_stay=* bookmarks.
 *
 * Wrap `china-cf-entry.js` remains for run_worker_first + debug headers only
 * (FORCE_COUNTRIES empty). Notice: https://otas0.github.io/buusdocst/
 */
import { NextResponse, type NextRequest } from "next/server";
import {
  CHINA_WORKERS_STAY_COOKIE,
  CHINA_WORKERS_STAY_PARAM,
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
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/|favicon.ico|favicon.svg|favicon.png|robots.txt|sitemap.xml).*)"
  ]
};
