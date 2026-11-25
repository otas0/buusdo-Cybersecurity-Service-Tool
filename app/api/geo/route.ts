import { NextResponse } from "next/server";
import { countryFromWorkersRequest } from "../../../shared/china-workers-redirect";

/**
 * Debug / soft-check: which country Cloudflare assigns this request.
 * Never redirects — safe for mainland probes of Workers reachability.
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
      service: "buusdocst"
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*"
      }
    }
  );
}
