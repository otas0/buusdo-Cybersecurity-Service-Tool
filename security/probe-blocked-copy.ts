/**
 * Single source for probe-blocked 403/429/503 copy from i18n/messages (any shipped locale).
 * Used by site-signals evidence and RiskResult display.
 */
import { getMessages, isPortugueseLocale } from "../i18n/messages";

export type ProbeBlockedLocale = string;

/**
 * Limitation copy for ambiguous probe HTTP statuses (403 refuse / 429 throttle / 503 overload).
 * Never escalate risk.
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
  if (isPortugueseLocale(locale)) {
    return {
      title: "O site bloqueou a sondagem automática",
      detail: `Recebido HTTP ${statusCode}. O site bloqueou ou limitou esta verificação — isso não prova phishing. Abra o endereço num browser normal se precisar.`
    };
  }
  return {
    title: "Site blocked the automated probe",
    detail: `Received HTTP ${statusCode}. The site blocked or throttled this check — that is not proof of phishing. Try the address in a normal browser if needed.`
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
 * RiskResult helper: pick 403/429/503 pair from live.statusCode or detail fallback.
 * @returns title/detail tuple, or genericFallback / undefined
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
  if (code === 403 || code === 429 || code === 503) {
    const copy = ambiguousProbeBlockedCopy(code, opts.locale);
    return [copy.title, copy.detail];
  }
  return opts.genericFallback;
}