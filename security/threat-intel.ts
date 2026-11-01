import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ThreatResult, ThreatState } from "./types";
import type { ParsedUrl } from "./types";
import { classifyUrl } from "../shared/detect.mjs";
import { getCachedThreat, setCachedThreat } from "./threat-cache";
import { isOwnThreatMergePtEnabled } from "./env-local";
/** Static imports — bundled into Cloudflare Workers (fs cwd paths are empty there). */
import curatedThreatsJson from "./data/curated-threats.json";
import curatedThreatsPtJson from "./data/curated-threats.pt.json";

export interface ThreatIntelProvider {
  providerName: string;
  checkUrl(url: string): Promise<ThreatResult>;
  checkDomain(domain: string): Promise<ThreatResult>;
}

type ThreatFile = {
  hosts?: Record<string, ThreatState>;
};

function hostsFrom(raw: ThreatFile | null | undefined): Record<string, ThreatState> {
  return raw?.hosts && typeof raw.hosts === "object" ? { ...raw.hosts } : {};
}

function loadHosts(filePath: string): Record<string, ThreatState> {
  try {
    if (!existsSync(filePath)) return {};
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as ThreatFile;
    return hostsFrom(raw);
  } catch {
    return {};
  }
}

const ROOT = resolve(process.cwd(), "security", "data");
/** Always present in the Worker bundle via static import. */
const CURATED = hostsFrom(curatedThreatsJson as ThreatFile);
const CURATED_PT = hostsFrom(curatedThreatsPtJson as ThreatFile);
/** Test-only hosts — fs load for local/CI; not required on Workers. */
const TEST_FIXTURES = loadHosts(resolve(ROOT, "test-threats.json"));

/** True when the curated list was compiled into this process (Workers-safe). */
export function isCuratedListPresent(): boolean {
  return Object.keys(CURATED).length > 0;
}

/** Optional extra first-party list path (operator-controlled file on disk). */
function operatorHosts(): Record<string, ThreatState> {
  const extra = process.env.OWN_THREAT_LIST_PATH?.trim();
  if (!extra) return {};
  return loadHosts(resolve(extra));
}

/** PT seeds — gated by OWN_THREAT_MERGE_PT (default merge on; .env.local hot-read). */
export function curatedPtHosts(): Record<string, ThreatState> {
  if (!isOwnThreatMergePtEnabled()) return {};
  return CURATED_PT;
}

function mergedHosts(): Record<string, ThreatState> {
  return { ...TEST_FIXTURES, ...CURATED, ...curatedPtHosts(), ...operatorHosts() };
}

function liveEvidence(reason: string | null) {
  if (reason?.startsWith("brand:")) {
    return "The host uses a protected organisation name but is not that organisation’s domain.";
  }
  if (reason === "userinfo") return "The address hides the real host behind an @ sign.";
  if (reason === "query-secret") return "The address puts a secret in the link. The value was not stored.";
  if (reason === "punycode-login") return "The host is punycode and the path asks for a sign-in.";
  if (reason === "ip-login") return "A numeric address is asking for a sign-in.";
  return "The address matched a protective signal.";
}

/**
 * First-party threat checks only.
 * URLs are never sent to Google Safe Browsing or other third-party reputation APIs.
 */
export class OwnThreatIntelProvider implements ThreatIntelProvider {
  providerName = "Preventive Shield own threat list";

  private lookup(domain: string): ThreatResult {
    const hosts = mergedHosts();
    let state: ThreatState | undefined = hosts[domain];
    let matched = domain;
    if (!state) {
      for (const [host, listed] of Object.entries(hosts)) {
        if (domain === host || domain.endsWith(`.${host}`)) {
          state = listed;
          matched = host;
          break;
        }
      }
    }
    const resolved: ThreatState = state ?? (domain.includes("unknown-new") ? "UNKNOWN" : "NO_KNOWN_MATCH");
    return {
      state: resolved,
      providerName: this.providerName,
      checkedAt: new Date().toISOString(),
      evidence: resolved.startsWith("KNOWN_")
        ? [`${matched} is listed in the Preventive Shield curated threat list.`]
        : ["No matching entry exists in the Preventive Shield curated threat list."]
    };
  }

  async checkUrl(url: string) {
    return this.lookup(new URL(url).hostname.toLowerCase().replace(/\.$/, ""));
  }

  async checkDomain(domain: string) {
    return this.lookup(domain.toLowerCase().replace(/\.$/, ""));
  }
}

/** @deprecated Alias kept for existing tests. */
export class LocalThreatIntelProvider extends OwnThreatIntelProvider {
  providerName = "Local threat list";
}

/** Kept so old imports do not break; always unavailable — we do not use third-party online providers. */
export class OnlineThreatIntelProviderPlaceholder implements ThreatIntelProvider {
  providerName = "Third-party online provider (disabled)";
  private unavailable(): ThreatResult {
    return {
      state: "PROVIDER_UNAVAILABLE",
      providerName: this.providerName,
      checkedAt: new Date().toISOString(),
      evidence: ["Third-party online reputation is disabled. Checks stay first-party."]
    };
  }
  async checkUrl(url: string) {
    void url;
    return this.unavailable();
  }
  async checkDomain(domain: string) {
    void domain;
    return this.unavailable();
  }
}

export function isOnlineThreatConfigured() {
  return false;
}

export async function checkThreat(parsed: ParsedUrl): Promise<ThreatResult> {
  const cacheKey = `own:${parsed.hostname}`;
  const cached = getCachedThreat(cacheKey);
  if (cached) return cached;

  const own = new OwnThreatIntelProvider();
  const listed = await own.checkUrl(parsed.fullUrl);
  if (listed.state !== "NO_KNOWN_MATCH") {
    setCachedThreat(cacheKey, listed);
    return listed;
  }

  const live = classifyUrl(parsed.fullUrl);
  if (live.kind === "phishing") {
    const result: ThreatResult = {
      state: "KNOWN_PHISHING",
      providerName: "Preventive Shield address signals",
      checkedAt: new Date().toISOString(),
      evidence: [liveEvidence(live.reason)]
    };
    setCachedThreat(cacheKey, result);
    return result;
  }

  setCachedThreat(cacheKey, listed);
  return listed;
}