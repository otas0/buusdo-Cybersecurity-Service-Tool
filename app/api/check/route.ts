import { NextResponse } from "next/server";
import { analyseWebsite } from "../../../security/analyse";
import { rateLimit } from "../../../security/rate-limit";
import { recordTimingSchemaFail } from "../../../security/timing-schema-fail-counters";
import { validateCheckTiming } from "../../../security/validate-check-timing";

export const runtime = "nodejs";

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "anon";
  return request.headers.get("x-real-ip") || "anon";
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "Retry-After",
    Vary: "Origin"
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  const headers = corsHeaders(request);
  // Rate-limit key is client IP only — body fields (url, skipHeadHosts, personalListBlocked) never amplify quotas.
  const limit = rateLimit(`check:${clientKey(request)}`);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "rate-limited", retryAfterSec: limit.retryAfterSec },
      { status: 429, headers: { ...headers, "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  try {
    const body = (await request.json()) as {
      url?: string;
      skipHeadHosts?: unknown;
      /** Read-only hint from extension/desktop — website does not store personal lists. */
      personalListBlocked?: unknown;
    };
    const url = String(body?.url || "").trim();
    if (!url) {
      return NextResponse.json({ ok: false, error: "url-required" }, { status: 400, headers });
    }

    const skipHeadHosts = Array.isArray(body.skipHeadHosts)
      ? body.skipHeadHosts.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 50)
      : [];
    if (body.personalListBlocked !== undefined && typeof body.personalListBlocked !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "personalListBlocked-must-be-boolean" },
        { status: 400, headers }
      );
    }
    const personalListBlocked = body.personalListBlocked === true;
    if (personalListBlocked && process.env.CHECK_PERSONAL_HINT_LOG !== "0") {
      // Operator metrics only — fixed string, never URL / host / payload.
      console.info("[api/check] personalListBlocked hint accepted");
    }

    const analysis = await analyseWebsite(url, { live: true, skipHeadHosts, personalListBlocked });
    const timingCheck = validateCheckTiming(analysis.timing);
    if (!timingCheck.ok) {
      console.error("[api/check] timing schema invalid:", timingCheck.errors.join("; "));
      // Mid-migration diagnostic only — keep details as string[] for clients; add diagnostic when 1.5 field is missing/mismatched.
      const hasAmbiguous =
        analysis.timing != null && typeof analysis.timing === "object" && "ambiguousProbeStatus" in analysis.timing;
      const ambiguousProbeStatus = hasAmbiguous
        ? (analysis.timing as { ambiguousProbeStatus?: unknown }).ambiguousProbeStatus
        : "absent";
      const counts = recordTimingSchemaFail(ambiguousProbeStatus);
      // Fixed strings only — never URL / host / payload.
      console.error(`[api/check] diagnostic.ambiguousProbeStatus=${String(ambiguousProbeStatus)}`);
      console.error(
        `[api/check] timing-schema-fail-count absent=${counts.ambiguousAbsent} boolean=${counts.ambiguousBoolean}`
      );
      return NextResponse.json(
        {
          ok: false,
          error: "timing-schema-invalid",
          details: timingCheck.errors,
          diagnostic: {
            ambiguousProbeStatus,
            hint: "CheckTiming 1.5 requires boolean ambiguousProbeStatus (403/429/503 probe). Run openapi:sync after schema bumps."
          }
        },
        { status: 500, headers }
      );
    }

    return NextResponse.json(
      { ok: true, analysis, timingValid: true },
      { headers }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "check-failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400, headers });
  }
}