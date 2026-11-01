import { NextResponse } from "next/server";
import { getConfiguredProbeTimeoutMs } from "../../../security/probe-budget";
import {
  PROBE_TIMEOUT_FORMULA,
  suggestProbeTimeoutMs
} from "../../../security/probe-budget-suggest";
import { listHeadSkipEntries, serializeHeadSkipEntry } from "../../../security/probe-head-skip";
import { isOwnThreatMergePtEnabled } from "../../../security/env-local";
import {
  getTimingSchemaFailCounters,
  isTimingSchemaFailHealthEnabled,
  TIMING_SCHEMA_FAIL_HEALTH_ENV
} from "../../../security/timing-schema-fail-counters";
import {
  ACCOUNT_SYNC_ENABLED_ENV,
  ACCOUNT_SYNC_REQUIRE_TURSO_ENV,
  isAccountSyncEnabled,
  isAccountSyncRequireTurso
} from "../../../security/account-sync/enabled";
import { isSqlStoreConfigured } from "../../../security/account-sync/store-sql";
import { isCuratedListPresent } from "../../../security/threat-intel";

export const runtime = "nodejs";

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin"
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: Request) {
  const probeTimeoutMs = getConfiguredProbeTimeoutMs();
  const baseline = suggestProbeTimeoutMs(probeTimeoutMs, null);
  const ownThreatMergePt = isOwnThreatMergePtEnabled();
  const headSkipEntries = listHeadSkipEntries().slice(0, 40);
  const pollRaw = new URL(request.url).searchParams.get("pollMs");
  const pollParsed = pollRaw != null && pollRaw !== "" ? Number(pollRaw) : NaN;
  const pollMs =
    Number.isFinite(pollParsed) && pollParsed > 0 ? Math.round(pollParsed) : undefined;

  const listenPort = process.env.PORT || process.env.VINEXT_PORT || "3000";
  const listenHint = `localhost:${listenPort}`;

  const personalHintLogEnabled = process.env.CHECK_PERSONAL_HINT_LOG !== "0";
  const timingSchemaFailHealth = isTimingSchemaFailHealthEnabled();
  const accountSyncEnabled = isAccountSyncEnabled();

  return NextResponse.json(
    {
      ok: true,
      service: "preventive-shield",
      threatIntel: "own",
      thirdPartyReputation: false,
      /** Static JSON import — true on Workers when curated-threats.json is in the bundle. */
      curatedListPresent: isCuratedListPresent(),
      ownThreatMergePt,
      ownThreatMergePtEnv: "OWN_THREAT_MERGE_PT",
      probeTimeoutMs,
      probeTimeoutEnv: "CHECK_PROBE_TIMEOUT_MS",
      probeTimeoutFormula: PROBE_TIMEOUT_FORMULA,
      probeTimeoutHint:
        "Compare probeTimeoutMs with Settings → timeout hosts (max probe). suggestedMs = maxObserved × 1.2 when local history reports repeated timeouts.",
      probeTimeoutSuggestion: baseline,
      headSkipDomains: headSkipEntries.map((row) => row.domain),
      headSkipEntries: headSkipEntries.map(serializeHeadSkipEntry),
      /** Soft notice on POST /api/check when personalListBlocked:true (no URL). */
      personalHintLogEnabled,
      personalHintLogEnv: "CHECK_PERSONAL_HINT_LOG",
      /** Optional account sync for personal block/trust lists only (ACCOUNT_SYNC_ENABLED=1 + Turso on Workers). */
      accountSyncEnabled,
      accountSyncEnabledEnv: ACCOUNT_SYNC_ENABLED_ENV,
      accountSyncRequireTurso: isAccountSyncRequireTurso(),
      accountSyncRequireTursoEnv: ACCOUNT_SYNC_REQUIRE_TURSO_ENV,
      accountSyncTursoConfigured: isSqlStoreConfigured(),
      checkedAt: new Date().toISOString(),
      listenHint,
      ...(pollMs != null ? { pollMs } : {}),
      ...(timingSchemaFailHealth
        ? {
            timingSchemaFailCounts: getTimingSchemaFailCounters(),
            timingSchemaFailCountsEnv: TIMING_SCHEMA_FAIL_HEALTH_ENV
          }
        : {})
    },
    { headers: corsHeaders(request) }
  );
}