import {
  CHINA_WORKERS_STAY_COOKIE,
  CHINA_WORKERS_STAY_PARAM
} from "../shared/china-workers-redirect";

type SearchLike =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | undefined;

/**
 * Former App Router CN→Pages enforce. Product decision (2026-11-28): **no-op**.
 * Mainland users cannot open Workers; CF-country redirects only mis-route others.
 */
export async function enforceChinaMainlandForceRedirect(_opts: {
  pathname: string;
  searchParams?: SearchLike;
}): Promise<void> {
  void _opts;
}

/** Client boot: ?china_workers_stay=1|0 → cookie, then reload without the param (legacy). */
export function ChinaWorkersStayBoot() {
  const src = `(function(){try{var p=new URLSearchParams(location.search);var v=p.get(${JSON.stringify(CHINA_WORKERS_STAY_PARAM)});if(v!=="1"&&v!=="0")return;var max=v==="1"?"; max-age=28800":"; max-age=0";document.cookie=${JSON.stringify(CHINA_WORKERS_STAY_COOKIE)}+"="+encodeURIComponent(v==="1"?"1":"")+"; path=/"+max+"; SameSite=Lax";p.delete(${JSON.stringify(CHINA_WORKERS_STAY_PARAM)});var q=p.toString();location.replace(location.pathname+(q?"?"+q:"")+(location.hash||""));}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: src }} />;
}
