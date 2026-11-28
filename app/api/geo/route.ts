import { NextResponse } from "next/server";
import { countryFromWorkersRequest } from "../../../shared/china-workers-redirect";
import { RUN_WORKER_FIRST } from "../../../shared/run-worker-first";

/**
 * Debug / soft-check: which country Cloudflare assigns this request.
 * Never redirects — safe for mainland probes of Workers reachability.
 *
 * Public surface: country code only. Prefer Actions ubuntu when local
 * *.workers.dev TCP times out (docs/LOCAL_CF_CONNECTIVITY.md).
 */
export async function GET(request: Request) {
  const country = countryFromWorkersRequest(
    request as Request & { cf?: { country?: string } }
  );
  return NextResponse.json(
    {
      ok: true,
      country: country || null,
      cfCountry:
        (request as Request & { cf?: { country?: string } }).cf?.country ?? null,
      headerCfIpCountry: request.headers.get("cf-ipcountry"),
      service: "buusdocst",
      /** Soft rate note — public debug; do not poll from hot paths. */
      rateNote:
        "Public debug: call sparingly (manual / CI soft job). Not for client hot loops.",
      /** Empty — Workers no longer force-redirect by CF country (2026-11-28). */
      forceRedirectCountries: [] as string[],
      /**
       * Docs-facing: wrap still stamps debug headers + run_worker_first.
       * China notice is Pages-only (no Worker 302).
       */
      wrapHints: {
        runWorkerFirst: RUN_WORKER_FIRST,
        note:
          "No HTML CN→Pages 302. If TCP to workers.dev fails, open https://otas0.github.io/buusdocst/ directly (store/QR/promo). Wrap keeps run_worker_first + debug headers only.",
        pagesOrigin: "https://otas0.github.io/buusdocst/",
        wrapHeader: "x-buusdocst-china-wrap",
        countryHeader: "x-buusdocst-cf-country",
        forceRedirect: false
      }
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "x-buusdocst-geo": "1"
      }
    }
  );
}
