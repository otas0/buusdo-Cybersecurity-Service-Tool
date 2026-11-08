/**
 * Single source for probe-blocked copy from i18n/messages (any shipped locale).
 * Used by site-signals evidence and RiskResult display.
 */
import { getMessages } from "../i18n/messages";

export type ProbeBlockedLocale = string;

function fillStatus(template: string, statusCode: number): string {
  return template.replaceAll("{status}", String(statusCode));
}

/**
 * Limitation copy for ambiguous probe HTTP statuses (403 refuse / 429 throttle / 503 overload / other).
 * Never escalate risk. Generic statuses use message-bag probeBlockedGeneric* (no hardcoded EN/pt).
 */
export function ambiguousProbeBlockedCopy(
  statusCode: number,
  locale: ProbeBlockedLocale = "en"
): { title: string; detail: string } {
  const m = getMessages(locale);
  if (statusCode === 403) {
    return { title: m.probeBlocked403Title, detail: m.probeBlocked403Detail };
  }
  if (statusCode === 429) {
    return { title: m.probeBlocked429Title, detail: m.probeBlocked429Detail };
  }
  if (statusCode === 503) {
    return { title: m.probeBlocked503Title, detail: m.probeBlocked503Detail };
  }
  return {
    title: m.probeBlockedGenericTitle,
    detail: fillStatus(m.probeBlockedGenericDetail, statusCode)
  };
}

/** Prefer live.statusCode; fall back to “HTTP NNN” in evidence detail. */
export function resolveProbeBlockedStatusCode(
  itemDetail: string,
  liveStatusCode?: number | null
): number | null {
  if (liveStatusCode === 403 || liveStatusCode === 429 || liveStatusCode === 503) {
    return liveStatusCode;
  }
  if (liveStatusCode != null && Number.isFinite(liveStatusCode)) return liveStatusCode;
  const fromDetail = /HTTP\s+(\d{3})/i.exec(itemDetail)?.[1];
  if (!fromDetail) return null;
  const n = Number(fromDetail);
  return Number.isFinite(n) ? n : null;
}

/**
 * RiskResult helper: pick probe-blocked pair from live.statusCode or detail fallback.
 * Always returns a bag-backed pair when a status code is known.
 */
export function probeBlockedPair(
  item: { id: string; detail: string },
  opts: {
    liveStatusCode?: number | null;
    locale: ProbeBlockedLocale;
    genericFallback?: [string, string];
  }
): [string, string] | undefined {
  if (item.id !== "probe-blocked") return undefined;
  const code = resolveProbeBlockedStatusCode(item.detail, opts.liveStatusCode);
  if (code == null) return opts.genericFallback;
  const copy = ambiguousProbeBlockedCopy(code, opts.locale);
  return [copy.title, copy.detail];
}
