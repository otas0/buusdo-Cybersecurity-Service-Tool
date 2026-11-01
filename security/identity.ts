import type { IdentityResult, Organisation } from "./types";
import type { ParsedUrl } from "./types";
import { analyseSimilarity } from "./url";

/** Organisations users can claim in the product UI (real brands, official domains). */
export const organisations: Organisation[] = [
  { id: "paypal", name: "PayPal", domains: ["paypal.com", "paypalobjects.com"], fictional: false },
  { id: "mbway", name: "MB WAY", domains: ["mbway.pt", "sibs.pt"], fictional: false },
  { id: "millenniumbcp", name: "Millennium bcp", domains: ["millenniumbcp.pt"], fictional: false },
  { id: "novobanco", name: "Novo Banco", domains: ["novobanco.pt"], fictional: false },
  { id: "santander", name: "Santander", domains: ["santander.pt", "santander.com"], fictional: false },
  { id: "cgd", name: "Caixa Geral de Depósitos", domains: ["cgd.pt"], fictional: false },
  { id: "ctt", name: "CTT", domains: ["ctt.pt"], fictional: false },
  { id: "apple", name: "Apple", domains: ["apple.com", "icloud.com"], fictional: false },
  { id: "microsoft", name: "Microsoft", domains: ["microsoft.com", "microsoftonline.com", "office.com", "live.com", "outlook.com"], fictional: false },
  { id: "google", name: "Google", domains: ["google.com", "google.pt", "gmail.com"], fictional: false },
  { id: "amazon", name: "Amazon", domains: ["amazon.com", "amazon.es", "amazon.co.uk"], fictional: false },
  { id: "facebook", name: "Facebook / Meta", domains: ["facebook.com", "fb.com", "meta.com", "instagram.com"], fictional: false },
  { id: "netflix", name: "Netflix", domains: ["netflix.com"], fictional: false },
  { id: "worten", name: "Worten", domains: ["worten.pt", "worten.net"], fictional: false },
  { id: "continente", name: "Continente", domains: ["continente.pt"], fictional: false }
];

/**
 * Fixtures used only by automated tests / evaluation.
 * Not shown in the product organisation list.
 */
export const testOrganisations: Organisation[] = [
  { id: "lusitania-bank", name: "Lusitania Bank", domains: ["lusitaniabank.test"], fictional: true },
  { id: "atlantic-parcel", name: "Atlantic Parcel", domains: ["atlanticparcel.test"], fictional: true },
  { id: "portuguese-services", name: "Portuguese Services", domains: ["servicesportugal.test"], fictional: true }
];

function findOrganisation(organisationId: string): Organisation | undefined {
  return (
    organisations.find((item) => item.id === organisationId) ||
    testOrganisations.find((item) => item.id === organisationId)
  );
}

function hostLabels(hostname: string): Set<string> {
  const labels = new Set<string>();
  for (const part of hostname.toLowerCase().split(".")) {
    for (const piece of part.split("-")) {
      if (piece) labels.add(piece);
    }
  }
  return labels;
}

function brandTokens(org: Organisation): string[] {
  const tokens = new Set<string>([org.id]);
  for (const domain of org.domains) {
    const head = domain.split(".")[0];
    if (head) tokens.add(head);
  }
  if (org.id === "cgd") tokens.add("caixa");
  if (org.id === "facebook") {
    tokens.add("meta");
    tokens.add("fb");
    tokens.add("instagram");
  }
  return [...tokens];
}

function isOfficialHost(parsed: ParsedUrl, org: Organisation): boolean {
  return org.domains.some(
    (domain) =>
      parsed.registrableDomain === domain ||
      parsed.hostname === domain ||
      parsed.hostname.endsWith(`.${domain}`)
  );
}

/**
 * Infer which organisation an address is impersonating or matching.
 * Used automatically during checks — no manual claim UI.
 */
export function inferOrganisationId(parsed: ParsedUrl): string | undefined {
  for (const org of organisations) {
    if (isOfficialHost(parsed, org)) return org.id;
  }

  const labels = hostLabels(parsed.hostname);
  for (const org of organisations) {
    if (!brandTokens(org).some((token) => labels.has(token))) continue;
    if (!isOfficialHost(parsed, org)) return org.id;
  }

  let best: { id: string; distance: number } | undefined;
  const labelLen = parsed.registrableDomain.split(".")[0]?.length ?? 0;
  for (const org of organisations) {
    const similarity = analyseSimilarity(parsed, org.domains);
    if (similarity.misleadingSubdomain) return org.id;
    const tight =
      similarity.similar &&
      similarity.distance > 0 &&
      ((labelLen >= 5 && similarity.distance <= 2) || (labelLen >= 4 && similarity.distance <= 1));
    if (tight) {
      if (!best || similarity.distance < best.distance) {
        best = { id: org.id, distance: similarity.distance };
      }
    }
  }
  return best?.id;
}

export function verifyIdentity(parsed: ParsedUrl, organisationId?: string): IdentityResult {
  if (!organisationId) return { state: "NO_CLAIM" };
  const organisation = findOrganisation(organisationId);
  if (!organisation) return { state: "UNVERIFIED" };
  const matchedDomain = organisation.domains.find((domain) => parsed.registrableDomain === domain);
  return matchedDomain
    ? { state: "VERIFIED_MATCH", claimedOrganisation: organisation, matchedDomain }
    : { state: "DOMAIN_MISMATCH", claimedOrganisation: organisation };
}