/**
 * Pure helper for RiskResult why-list (testable without a React render harness).
 * Keep unit coverage in tests/risk-why-items.test.ts — no barrel export until more helpers land.
 */

import {
  probeBlockedPair,
  type ProbeBlockedLocale
} from "../security/probe-blocked-copy";

export type WhyEvidence = { id: string; kind: string };

export type WhyEvidenceFull = {
  id: string;
  kind?: string;
  title?: string;
  detail?: string;
};

/**
 * Strong why-list rows. When the Halt banner already shows user-block, omit that id
 * so the list does not duplicate the accent callout.
 */
export function riskWhyItems(
  evidence: WhyEvidence[],
  opts: { bannerShowsUserBlock?: boolean } = {}
): WhyEvidence[] {
  const omitUserBlock = Boolean(opts.bannerShowsUserBlock);
  return evidence
    .filter(
      (item) =>
        (item.kind === "known" || item.kind === "signal" || item.kind === "likely") &&
        !(omitUserBlock && item.id === "user-block")
    )
    .slice(0, 4);
}

/**
 * Display copy for a why-list (or detail) evidence row.
 * probe-blocked uses probeBlockedPair the same way as RiskResult detail rows
 * (live.statusCode, then HTTP NNN in detail).
 */
export function whyEvidenceDisplay(
  item: WhyEvidenceFull,
  opts: {
    liveStatusCode?: number | null;
    locale: ProbeBlockedLocale;
  }
): { title: string; detail: string } {
  if (item.id === "probe-blocked") {
    const pair = probeBlockedPair(
      { id: item.id, detail: item.detail ?? "" },
      {
        liveStatusCode: opts.liveStatusCode,
        locale: opts.locale
      }
    );
    if (pair) return { title: pair[0], detail: pair[1] };
  }
  return {
    title: item.title ?? item.id,
    detail: item.detail ?? ""
  };
}