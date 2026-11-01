import type { ThreatResult } from "./types";

type CacheEntry = { at: number; value: ThreatResult };

const store = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = Number(process.env.THREAT_CACHE_TTL_MS || 60 * 60 * 1000);

export function getCachedThreat(key: string): ThreatResult | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > DEFAULT_TTL_MS) {
    store.delete(key);
    return null;
  }
  return hit.value;
}

export function setCachedThreat(key: string, value: ThreatResult) {
  store.set(key, { at: Date.now(), value });
  if (store.size > 5000) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
}