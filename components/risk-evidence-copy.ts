/**
 * Halt / result evidence + level labels from the message bag (EN / pt-PT / zh-Hans…).
 */
import type { MessageBag } from "../i18n/messages";

const EVIDENCE_IDS = [
  "known-threat",
  "no-match",
  "unknown-reputation",
  "provider-unavailable",
  "identity-match",
  "identity-mismatch",
  "misleading-subdomain",
  "lookalike",
  "punycode",
  "http",
  "sensitive-path",
  "sensitive",
  "checked-address",
  "dns-ok",
  "dns-fail",
  "http-status",
  "redirect-chain",
  "cross-redirect",
  "redirect",
  "unreachable",
  "tls-fail",
  "ip-host",
  "risky-tld",
  "deep-subdomain",
  "secret-query",
  "probe-timeout",
  "https-limit",
  "scope-limit",
  "user-block"
] as const;

export type EvidenceId = (typeof EVIDENCE_IDS)[number];

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

function keyFor(id: string, part: "Title" | "Detail"): keyof MessageBag | null {
  const camel = id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  const name = `evidence${camel.charAt(0).toUpperCase()}${camel.slice(1)}${part}`;
  return name as keyof MessageBag;
}

/** Title + detail for an evidence id, or undefined if bag lacks both keys. */
export function evidencePairFromBag(
  t: MessageBag,
  id: string,
  vars: Record<string, string> = {}
): [string, string] | undefined {
  const titleKey = keyFor(id, "Title");
  const detailKey = keyFor(id, "Detail");
  if (!titleKey || !detailKey) return undefined;
  const title = t[titleKey];
  const detail = t[detailKey];
  if (!title?.trim() || !detail?.trim()) return undefined;
  return [fill(title, vars), fill(detail, vars)];
}

export function riskLevelCopy(
  t: MessageBag,
  level: string
): { label: string; note: string } | undefined {
  const map: Record<string, { label: keyof MessageBag; note: keyof MessageBag }> = {
    CRITICAL: { label: "riskLevelCritical", note: "riskLevelCriticalNote" },
    HIGH: { label: "riskLevelHigh", note: "riskLevelHighNote" },
    CAUTION: { label: "riskLevelCaution", note: "riskLevelCautionNote" },
    LOW_EVIDENCE: { label: "riskLevelLowEvidence", note: "riskLevelLowEvidenceNote" },
    UNKNOWN: { label: "riskLevelUnknown", note: "riskLevelUnknownNote" }
  };
  const keys = map[level];
  if (!keys) return undefined;
  const label = t[keys.label];
  const note = t[keys.note];
  if (!label?.trim() || !note?.trim()) return undefined;
  return { label, note };
}

export function recommendationCopy(t: MessageBag, recommendation: string): string {
  const map: Record<string, keyof MessageBag> = {
    LEAVE_AND_BLOCK: "recommendLeaveAndBlock",
    LEAVE: "recommendLeave",
    VERIFY_INDEPENDENTLY: "recommendVerify",
    PROCEED_WITH_CARE: "recommendProceed"
  };
  const key = map[recommendation];
  if (key && t[key]?.trim()) return t[key];
  return recommendation;
}

export { EVIDENCE_IDS };
