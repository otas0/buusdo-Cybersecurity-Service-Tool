import type { ParsedUrl, RiskEvidence, SensitiveRequest } from "./types";
import { organisations } from "./identity";
import { analyseSimilarity } from "./url";
import { ambiguousProbeBlockedCopy } from "./probe-blocked-copy";

export { ambiguousProbeBlockedCopy } from "./probe-blocked-copy";

/** TLDs often abused in phishing / disposable campaigns. Not proof by itself. */
const RISKY_TLDS = new Set([
  "zip",
  "mov",
  "tk",
  "ml",
  "ga",
  "cf",
  "gq",
  "xyz",
  "top",
  "icu",
  "cfd",
  "rest",
  "country",
  "support",
  "accountants",
  "work",
  "click",
  "link",
  "loan",
  "men",
  "bid",
  "win",
  "vip",
  "cam",
  "sbs"
]);

const CREDENTIAL_PATH =
  /\/(login|log-in|signin|sign-in|signup|sign-up|verify|verification|account|accounts|password|passwd|banking|wallet|auth|oauth|session|reset-password|forgot-password)\b/i;
const PAYMENT_PATH = /\/(pay|payment|checkout|billing|card|invoice|transfer|mbway|sepa)\b/i;
const PERSONAL_PATH = /\/(ssn|nif|id-card|passport|personal-data|dados-pessoais|perfil|profile)\b/i;
const SECRET_QUERY = /(?:^|[?&])(?:password|passwd|pwd|token|otp|pin)=/i;

export type LiveProbe = {
  resolved: boolean;
  addresses: string[];
  reachable: boolean;
  statusCode: number | null;
  finalUrl: string | null;
  redirectChain: string[];
  redirected: boolean;
  crossDomainRedirect: boolean;
  tlsOk: boolean | null;
  error: string | null;
  timedOut: boolean;
  /** True when HEAD failed/rejected and GET was used on the first hop. */
  probeHeadFailed?: boolean;
};

export type SiteSignalReport = {
  evidence: RiskEvidence[];
  sensitive: SensitiveRequest;
  cautionCount: number;
  highCount: number;
};

function tldOf(registrableDomain: string): string {
  const parts = registrableDomain.toLowerCase().split(".");
  return parts[parts.length - 1] || "";
}

function isIpHost(hostname: string): boolean {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(":");
}

export function inferSensitiveRequest(parsed: ParsedUrl): SensitiveRequest {
  if (CREDENTIAL_PATH.test(parsed.path)) return "password";
  if (PAYMENT_PATH.test(parsed.path)) return "payment";
  if (PERSONAL_PATH.test(parsed.path)) return "personal";
  return null;
}

/**
 * Bot / rate-limit / overload replies — not a phishing signal; must not flip LOW_EVIDENCE ↔ CAUTION.
 * Only 403 / 429 / 503 are ambiguous. Other 4xx/5xx (e.g. 401, 404, 502, 520) still escalate CAUTION.
 */
export function isAmbiguousProbeStatus(statusCode: number): boolean {
  return statusCode === 403 || statusCode === 429 || statusCode === 503;
}

/**
 * Structural signals for any website — not limited to known brands.
 */
export function collectSiteSignals(parsed: ParsedUrl, live: LiveProbe | null = null): SiteSignalReport {
  const evidence: RiskEvidence[] = [];
  let cautionCount = 0;
  let highCount = 0;

  const sensitive = inferSensitiveRequest(parsed);

  evidence.push({
    id: "checked-address",
    kind: "known",
    title: "Address parsed",
    detail: `Checked ${parsed.registrableDomain} (${parsed.usesHttps ? "HTTPS" : "HTTP"}).`
  });

  if (!parsed.usesHttps) {
    cautionCount += 1;
    evidence.push({
      id: "http",
      kind: "signal",
      title: "Connection is not encrypted",
      detail: "Information sent over HTTP may be exposed in transit."
    });
  }

  if (isIpHost(parsed.hostname)) {
    highCount += 1;
    evidence.push({
      id: "ip-host",
      kind: "signal",
      title: "Numeric host address",
      detail: "The site is reached by IP instead of a normal domain name. That is unusual for trustworthy services."
    });
  }

  if (parsed.hasPunycode) {
    cautionCount += 1;
    evidence.push({
      id: "punycode",
      kind: "signal",
      title: "Encoded internationalised domain",
      detail: "The hostname contains punycode. It may be legitimate, but visually confusing characters deserve extra care."
    });
  }

  const tld = tldOf(parsed.registrableDomain);
  if (RISKY_TLDS.has(tld)) {
    cautionCount += 1;
    evidence.push({
      id: "risky-tld",
      kind: "signal",
      title: "Uncommon or high-abuse domain ending",
      detail: `The domain ends with .${tld}, which is more often abused in phishing campaigns. This alone is not proof of harm.`
    });
  }

  const labels = parsed.hostname.split(".").filter(Boolean);
  if (labels.length >= 5) {
    cautionCount += 1;
    evidence.push({
      id: "deep-subdomain",
      kind: "signal",
      title: "Unusually deep subdomain chain",
      detail: "Long subdomain chains are sometimes used to make a fake site look official."
    });
  }

  if (SECRET_QUERY.test(parsed.path)) {
    highCount += 1;
    evidence.push({
      id: "secret-query",
      kind: "signal",
      title: "Secret placed in the link",
      detail: "The address puts a secret in the query string. The value was not stored."
    });
  }

  if (sensitive) {
    cautionCount += 1;
    evidence.push({
      id: "sensitive-path",
      kind: "signal",
      title:
        sensitive === "payment"
          ? "Payment-related page path"
          : sensitive === "personal"
            ? "Personal-data page path"
            : "Sign-in or account page path",
      detail: "The path suggests the page may ask for sensitive information. Confirm the domain independently before entering anything."
    });
  }

  const isKnownOfficial = organisations.some((org) =>
    org.domains.some(
      (domain) =>
        parsed.registrableDomain === domain ||
        parsed.hostname === domain ||
        parsed.hostname.endsWith(`.${domain}`)
    )
  );

  if (!isKnownOfficial) {
    for (const org of organisations) {
      const similarity = analyseSimilarity(parsed, org.domains);
      if (similarity.misleadingSubdomain) {
        highCount += 1;
        evidence.push({
          id: "misleading-subdomain",
          kind: "signal",
          title: "Misleading subdomain signal",
          detail: `A label resembling ${org.name} appears before the controlling domain ${parsed.registrableDomain}.`
        });
        break;
      }
      const labelLen = parsed.registrableDomain.split(".")[0]?.length ?? 0;
      const tight =
        similarity.similar &&
        similarity.distance > 0 &&
        ((labelLen >= 5 && similarity.distance <= 2) || (labelLen >= 4 && similarity.distance <= 1));
      if (tight) {
        cautionCount += 1;
        evidence.push({
          id: "lookalike",
          kind: "signal",
          title: "Domain similarity signal",
          detail: `This domain closely resembles ${similarity.closestDomain} (${org.name}). Similarity is a warning signal, not proof of phishing.`
        });
        break;
      }
    }
  }

  if (live) {
    if (live.timedOut) {
      evidence.push({
        id: "probe-timeout",
        kind: "unknown",
        title: "Live check timed out",
        detail: "The site did not respond in time. Structural signals still apply; try again if the site is usually slow or blocks automated checks."
      });
    } else if (live.reachable) {
      evidence.push({
        id: "dns-ok",
        kind: "known",
        title: "Host is reachable",
        detail: live.addresses.length
          ? `Live check reached the host (DNS: ${live.addresses.slice(0, 3).join(", ")}).`
          : "Live check reached the host."
      });
    } else if (!live.resolved) {
      highCount += 1;
      evidence.push({
        id: "dns-fail",
        kind: "signal",
        title: "Host could not be reached",
        detail: "The host did not respond to a live check. The address may be mistyped, down, or blocking automated requests."
      });
    } else {
      // DNS ok, fetch failed — often bot/CDN blocks (YouTube, Cloudflare). Record, do not escalate Hold.
      evidence.push({
        id: "unreachable",
        kind: "unknown",
        title: "Site did not respond",
        detail: live.error
          ? `A live request failed (${live.error}). The address may still open in a browser, but this check could not confirm it.`
          : "A live request failed. The address may still open in a browser, but this check could not confirm it."
      });
    }

    if (live.reachable && live.statusCode != null) {
      if (isAmbiguousProbeStatus(live.statusCode)) {
        // 403/429/503 — refuse / throttle / overload; not phishing proof.
        const copy = ambiguousProbeBlockedCopy(live.statusCode);
        evidence.push({
          id: "probe-blocked",
          kind: "limitation",
          title: copy.title,
          detail: copy.detail
        });
      } else {
        evidence.push({
          id: "http-status",
          kind: "known",
          title: "Site responded",
          detail: `Received HTTP ${live.statusCode}${live.finalUrl ? ` at ${live.finalUrl}` : ""}.`
        });
        // e.g. 404 still raises CAUTION; only 403/429/503 are exempt.
        if (live.statusCode >= 400) {
          cautionCount += 1;
        }
      }
    }

    if (live.redirectChain?.length > 1) {
      evidence.push({
        id: "redirect-chain",
        kind: live.crossDomainRedirect ? "signal" : "known",
        title: live.crossDomainRedirect ? "Redirect chain crosses domains" : "Redirect chain",
        detail: live.redirectChain.join(" → ")
      });
    }

    if (live.crossDomainRedirect) {
      highCount += 1;
      evidence.push({
        id: "cross-redirect",
        kind: "signal",
        title: "Redirect to a different domain",
        detail: `The address redirected to another registrable domain (${live.finalUrl || "unknown"}). Confirm the final site before trusting it.`
      });
    } else if (live.redirected) {
      evidence.push({
        id: "redirect",
        kind: "known",
        title: "Address redirects",
        detail: `The request followed a redirect to ${live.finalUrl || "another URL"} on the same organisation domain.`
      });
    }

    if (parsed.usesHttps && live.tlsOk === false) {
      highCount += 1;
      evidence.push({
        id: "tls-fail",
        kind: "signal",
        title: "TLS / certificate problem",
        detail: "HTTPS could not be validated for this host. Do not enter sensitive information."
      });
    }
  }

  evidence.push({
    id: "https-limit",
    kind: "limitation",
    title: "HTTPS is not identity proof",
    detail: "HTTPS protects the connection but does not prove the identity or trustworthiness of the website."
  });

  evidence.push({
    id: "scope-limit",
    kind: "limitation",
    title: "What this check covers",
    detail: "This product checks the address against buusdo's own curated threat list and address signals, brand lookalikes, DNS, reachability and redirects. URLs are not sent to third-party reputation services. Page content is not fully crawled."
  });

  return { evidence, sensitive, cautionCount, highCount };
}