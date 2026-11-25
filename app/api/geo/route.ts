import { NextResponse } from "next/server";
import { countryFromWorkersRequest } from "../../../shared/china-workers-redirect";

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
      forceRedirectCountries: ["CN"]
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
