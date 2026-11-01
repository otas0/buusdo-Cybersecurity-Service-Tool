import { inferOrganisationId, verifyIdentity } from "./identity";
import { probeUrl } from "./live-probe";
import { assessRisk } from "./risk";
import { collectSiteSignals, isAmbiguousProbeStatus, type LiveProbe } from "./site-signals";
import { checkThreat } from "./threat-intel";
import type { SensitiveRequest } from "./types";
import { parseUrl } from "./url";
import { getConfiguredProbeTimeoutMs } from "./probe-budget";
import { shouldSkipHead } from "./probe-head-skip";
export type AnalyseOptions = {
  organisationId?: string;
  sensitive?: SensitiveRequest;
  /** Skip live DNS/HTTP probe (unit tests). Default: probe when running on the server. */
  live?: boolean | LiveProbe | null;
  /** Client-hint domains that repeatedly fail HEAD (from local history). */
  skipHeadHosts?: string[];
  /**
   * Read-only client hint that extension/desktop personal lists blocked this host.
   * Website never stores or enforces personal lists — evidence only when true.
   */
  personalListBlocked?: boolean;
};

/** Server-side stage timings (ms) for probe tuning. */
export type CheckTiming = {
  parseMs: number;
  threatMs: number;
  probeMs: number | null;
  riskMs: number;
  totalMs: number;
  probeTimeoutMs: number;
  /** True when live probe fell back from HEAD to GET on the first hop. */
  probeHeadFailed: boolean;
  /** True when HEAD was skipped intentionally (server cache or client skipHeadHosts). */
  headSkipped: boolean;
  /** True when live HTTP status was 403/429/503 (bot block / throttle — not a risk escalate). */
  ambiguousProbeStatus: boolean;
};

function nowMs() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

export async function analyseUrl(url: string, organisationId?: string, sensitive: SensitiveRequest = null) {
  return analyseWebsite(url, { organisationId, sensitive, live: false });
}

/** Full product check — works for any http(s) website. */
export async function analyseWebsite(url: string, options: AnalyseOptions = {}) {
  const started = nowMs();
  const probeTimeoutMs = getConfiguredProbeTimeoutMs();

  const t0 = nowMs();
  const parsed = parseUrl(url);
  const parseMs = Math.round(nowMs() - t0);

  const t1 = nowMs();
  const threat = await checkThreat(parsed);
  const threatMs = Math.round(nowMs() - t1);

  const inferredId = options.organisationId || inferOrganisationId(parsed);
  const identity = verifyIdentity(parsed, inferredId);

  let live: LiveProbe | null = null;
  let probeMs: number | null = null;
  let probeHeadFailed = false;
  let headSkipped = false;
  if (options.live && typeof options.live === "object") {
    live = options.live;
    probeMs = 0;
    probeHeadFailed = Boolean(live.probeHeadFailed);
    headSkipped = false;
  } else if (options.live === true) {
    const t2 = nowMs();
    const skipHead = shouldSkipHead(parsed.registrableDomain, options.skipHeadHosts || []);
    headSkipped = skipHead;
    live = await probeUrl(parsed.fullUrl, { skipHead });
    probeMs = Math.round(nowMs() - t2);
    probeHeadFailed = Boolean(live.probeHeadFailed);
  }

  const t3 = nowMs();
  const site = collectSiteSignals(parsed, live);
  const effectiveSensitive = options.sensitive ?? site.sensitive;
  const risk = assessRisk(parsed, threat, identity, effectiveSensitive, live, site, {
    personalListBlocked: Boolean(options.personalListBlocked)
  });
  const riskMs = Math.round(nowMs() - t3);

  const ambiguousProbeStatus = Boolean(
    live?.reachable &&
      live.statusCode != null &&
      isAmbiguousProbeStatus(live.statusCode)
  );

  const timing: CheckTiming = {
    parseMs,
    threatMs,
    probeMs,
    riskMs,
    totalMs: Math.round(nowMs() - started),
    probeTimeoutMs,
    probeHeadFailed,
    headSkipped,
    ambiguousProbeStatus
  };

  return {
    parsed,
    threat,
    identity,
    risk,
    sensitive: effectiveSensitive,
    inferredOrganisationId: inferredId ?? null,
    live,
    timing,
    /** Echo of read-only personal-list hint (never persisted by the website). */
    personalListBlocked: Boolean(options.personalListBlocked)
  };
}

export type Analysis = Awaited<ReturnType<typeof analyseWebsite>>;