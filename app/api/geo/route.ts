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
      /** Product: only CN HTML is force-redirected (HK/MO stay on Workers). */
      forceRedirectCountries: ["CN"],
      /**
       * Docs-facing: deploy wrap sets assets.run_worker_first to this pattern
       * (not boolean true). Live edge flag is on the Worker version; CI soft
       * job also checks response header x-buusdocst-china-wrap.
       */
      wrapHints: {
        runWorkerFirst: RUN_WORKER_FIRST,
        note:
          "HTML CN→Pages needs china-cf-entry + run_worker_first pattern. If TCP to workers.dev fails, open https://otas0.github.io/buusdocst/ — no 302 can run. Spoofing CF-IPCountry does not override request.cf.country.",
        pagesOrigin: "https://otas0.github.io/buusdocst/",
        wrapHeader: "x-buusdocst-china-wrap",
        countryHeader: "x-buusdocst-cf-country"
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
