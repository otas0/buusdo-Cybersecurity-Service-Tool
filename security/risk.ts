import type {
  IdentityResult,
  ParsedUrl,
  RiskAssessment,
  RiskEvidence,
  RiskLevel,
  SensitiveRequest,
  ThreatResult
} from "./types";
import type { LiveProbe, SiteSignalReport } from "./site-signals";
import { collectSiteSignals } from "./site-signals";
import { analyseSimilarity } from "./url";
import { personalUserBlockEvidence, USER_BLOCK_EVIDENCE_ID } from "./evidence-ids";

export type AssessRiskOptions = {
  /** Read-only personal-list hint (extension/desktop). Website never stores lists. */
  personalListBlocked?: boolean;
};

export function assessRisk(
  parsed: ParsedUrl,
  threat: ThreatResult,
  identity: IdentityResult,
  sensitive: SensitiveRequest,
  live: LiveProbe | null = null,
  site: SiteSignalReport | null = null,
  opts: AssessRiskOptions = {}
): RiskAssessment {
  const siteReport = site ?? collectSiteSignals(parsed, live);
  const evidence: RiskEvidence[] = [];
  const knownThreat = threat.state === "KNOWN_MALICIOUS" || threat.state === "KNOWN_PHISHING";
  const identityMismatch = identity.state === "DOMAIN_MISMATCH";
  let similaritySignal = false;
  let misleadingSubdomain = false;

  if (knownThreat) {
    evidence.push({
      id: "known-threat",
      kind: "known",
      title: threat.state === "KNOWN_PHISHING" ? "Known phishing signal detected" : "Known malicious signal detected",
      detail: threat.evidence[0] || "This address matched a known threat signal."
    });
  } else if (threat.state === "NO_KNOWN_MATCH") {
    evidence.push({
      id: "no-match",
      kind: "unknown",
      title: "No known threat found in the lists checked",
      detail: "No known threat was found in the sources checked. This is not proof that the website is safe."
    });
  } else if (threat.state === "PROVIDER_UNAVAILABLE") {
    evidence.push({
      id: "provider-unavailable",
      kind: "unknown",
      title: "Threat list unavailable",
      detail: "The first-party threat list could not be read. Structural and live address checks still ran."
    });
  } else {
    evidence.push({
      id: "unknown-reputation",
      kind: "unknown",
      title: "Reputation is unknown",
      detail: "The source checked cannot provide a positive or negative reputation result."
    });
  }

  if (identity.state === "VERIFIED_MATCH") {
    evidence.push({
      id: "identity-match",
      kind: "known",
      title: "Domain matches a known organisation",
      detail: `The registrable domain matches ${identity.claimedOrganisation?.name}’s listed domain. This does not mean the website is safe.`
    });
  }

  if (identityMismatch) {
    evidence.push({
      id: "identity-mismatch",
      kind: "signal",
      title: "Looks like a known organisation, but the domain does not match",
      detail: `The address appears related to ${identity.claimedOrganisation?.name}, yet the controlling domain is ${parsed.registrableDomain}.`
    });
    const similarity = analyseSimilarity(parsed, identity.claimedOrganisation?.domains ?? []);
    similaritySignal = similarity.similar;
    misleadingSubdomain = similarity.misleadingSubdomain;
    if (similarity.misleadingSubdomain) {
      evidence.push({
        id: "misleading-subdomain",
        kind: "signal",
        title: "Misleading subdomain signal",
        detail: `A label resembling ${identity.claimedOrganisation?.name} appears before the controlling domain ${parsed.registrableDomain}.`
      });
    } else if (similarity.similar) {
      evidence.push({
        id: "lookalike",
        kind: "signal",
        title: "Domain similarity signal",
        detail: `This domain closely resembles ${similarity.closestDomain} (${identity.claimedOrganisation?.name}). Similarity is a warning signal, not proof of phishing.`
      });
    }
  }

  const seen = new Set(evidence.map((item) => item.id));
  for (const item of siteReport.evidence) {
    if (seen.has(item.id)) continue;
    // Prefer identity-driven lookalike copy when both exist.
    if ((item.id === "lookalike" || item.id === "misleading-subdomain") && identityMismatch) {
      if (item.id === "misleading-subdomain") misleadingSubdomain = true;
      if (item.id === "lookalike") similaritySignal = true;
    }
    evidence.push(item);
    seen.add(item.id);
  }

  const effectiveSensitive = sensitive || siteReport.sensitive;
  if (effectiveSensitive && !seen.has("sensitive-path")) {
    evidence.push({
      id: "sensitive-path",
      kind: "signal",
      title:
        effectiveSensitive === "payment"
          ? "Payment-related page path"
          : effectiveSensitive === "personal"
            ? "Personal-data page path"
            : "Sign-in or account page path",
      detail: "The path or check context suggests the page may ask for sensitive information. Confirm the domain independently before entering anything."
    });
    seen.add("sensitive-path");
  }

  let level: RiskLevel;
  if (knownThreat && (identityMismatch || Boolean(effectiveSensitive))) {
    level = "CRITICAL";
  } else if (
    knownThreat ||
    (identityMismatch && Boolean(effectiveSensitive)) ||
    (misleadingSubdomain && Boolean(effectiveSensitive)) ||
    siteReport.highCount >= 2
  ) {
    level = "HIGH";
  } else if (
    identityMismatch ||
    Boolean(effectiveSensitive) ||
    parsed.hasPunycode ||
    !parsed.usesHttps ||
    similaritySignal ||
    misleadingSubdomain ||
    siteReport.cautionCount >= 1 ||
    siteReport.highCount >= 1
  ) {
    level = "CAUTION";
  } else if (threat.state === "UNKNOWN" || threat.state === "PROVIDER_UNAVAILABLE") {
    level = "UNKNOWN";
  } else {
    level = "LOW_EVIDENCE";
  }

  // Level → recommendation (before personal-list hint):
  // CRITICAL→LEAVE_AND_BLOCK, HIGH→LEAVE, CAUTION|UNKNOWN→VERIFY_INDEPENDENTLY, else PROCEED_WITH_CARE.
  let recommendation: RiskAssessment["recommendation"] =
    level === "CRITICAL"
      ? "LEAVE_AND_BLOCK"
      : level === "HIGH"
        ? "LEAVE"
        : level === "CAUTION" || level === "UNKNOWN"
          ? "VERIFY_INDEPENDENTLY"
          : "PROCEED_WITH_CARE";

  const personalEv = personalUserBlockEvidence(Boolean(opts.personalListBlocked));
  if (personalEv && !seen.has(USER_BLOCK_EVIDENCE_ID)) {
    evidence.push(personalEv);
    seen.add(USER_BLOCK_EVIDENCE_ID);
  }
  // Personal-hint LEAVE rule (after ternary): only LOW_EVIDENCE upgrades PROCEED_WITH_CARE → LEAVE.
  // Never override LEAVE_AND_BLOCK / LEAVE / VERIFY_INDEPENDENTLY from stronger levels.
  // @see tests/assess-risk-personal-hint.test.ts
  if (opts.personalListBlocked && level === "LOW_EVIDENCE") {
    recommendation = "LEAVE";
  }

  return {
    level,
    confidence: knownThreat ? "HIGH" : identity.state !== "NO_CLAIM" || live ? "MODERATE" : "LIMITED",
    evidence,
    recommendation,
    limitations: [
      "Signals can produce false positives or false negatives.",
      "This check does not fully inspect page scripts or prove who operates a domain.",
      "An identity match does not guarantee that every action on a website is safe.",
      "Online blocklists improve coverage when configured; structural and live checks always run."
    ]
  };
}