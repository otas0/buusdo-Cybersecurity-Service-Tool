import { NextResponse } from "next/server";
import { applyProbeEnvUpdates } from "../../../../security/probe-env-apply";

export const runtime = "nodejs";

/**
 * Local-dev only: write CHECK_PROBE_TIMEOUT_MS and/or OWN_THREAT_MERGE_PT into .env.local
 * (or security/data/runtime/env-overrides.env fallback) with in-process hot overrides.
 * Disabled in production.
 *
 * Body: { ms?: number, ownThreatMergePt?: boolean }
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "dev-only" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { ms?: number; ownThreatMergePt?: boolean };
    const result = applyProbeEnvUpdates(body);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "write-failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}