import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  CHINA_WORKERS_STAY_COOKIE,
  CHINA_WORKERS_STAY_PARAM,
  chinaPagesDestForWorkersPath,
  isChinaForceCountry
} from "../shared/china-workers-redirect";

type SearchLike =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | undefined;

function stayParamFromSearch(search: SearchLike): string | null {
  if (!search) return null;
  if (typeof URLSearchParams !== "undefined" && search instanceof URLSearchParams) {
    return search.get(CHINA_WORKERS_STAY_PARAM);
  }
  const v = (search as Record<string, string | string[] | undefined>)[
    CHINA_WORKERS_STAY_PARAM
  ];
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/**
 * Vinext/Workers build does not ship Next middleware.ts into the Worker bundle.
 * Enforce CN→Pages in App Router pages via CF-IPCountry (HTML only; /api/* skips layouts).
 */
export async function enforceChinaMainlandForceRedirect(opts: {
  pathname: string;
  searchParams?: SearchLike;
}): Promise<void> {
  const jar = await cookies();
  const h = await headers();
  const stayQ = stayParamFromSearch(opts.searchParams);

  if (stayQ === "1") {
    // Cookie is set by ChinaWorkersStayBoot on the client; allow this request through.
    return;
  }
  if (jar.get(CHINA_WORKERS_STAY_COOKIE)?.value === "1" && stayQ !== "0") {
    return;
  }

  // Worker entry wrap injects cf-ipcountry from request.cf.country when missing.
  const country =
    h.get("cf-ipcountry") ||
    h.get("CF-IPCountry") ||
    h.get("x-vercel-ip-country") ||
    "";

  if (!isChinaForceCountry(country)) {
    return;
  }

  redirect(chinaPagesDestForWorkersPath(opts.pathname || "/"));
}

/** Client boot: ?china_workers_stay=1|0 → cookie, then reload without the param. */
export function ChinaWorkersStayBoot() {
  const src = `(function(){try{var p=new URLSearchParams(location.search);var v=p.get(${JSON.stringify(CHINA_WORKERS_STAY_PARAM)});if(v!=="1"&&v!=="0")return;var max=v==="1"?"; max-age=28800":"; max-age=0";document.cookie=${JSON.stringify(CHINA_WORKERS_STAY_COOKIE)}+"="+encodeURIComponent(v==="1"?"1":"")+"; path=/"+max+"; SameSite=Lax";p.delete(${JSON.stringify(CHINA_WORKERS_STAY_PARAM)});var q=p.toString();location.replace(location.pathname+(q?"?"+q:"")+(location.hash||""));}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: src }} />;
}
