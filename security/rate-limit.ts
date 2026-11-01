type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function windowMs(): number {
  return Number(process.env.CHECK_RATE_WINDOW_MS || 60_000);
}

function maxHits(): number {
  return Number(process.env.CHECK_RATE_LIMIT || 30);
}

/**
 * Fixed-window counter keyed only by the caller-supplied `key` (typically `check:<ip>`).
 * Body fields (`url`, `skipHeadHosts`, `personalListBlocked`, …) must never join the key —
 * `app/api/check/route.ts` uses `check:${clientKey(request)}` (IP) only so hints cannot amplify quotas.
 */
export function rateLimit(key: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const WINDOW_MS = windowMs();
  const MAX_HITS = maxHits();
  const current = buckets.get(key);
  if (!current || now >= current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfterSec: 0 };
  }
  current.count += 1;
  if (current.count > MAX_HITS) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfterSec: 0 };
}

/** Test helper — clear one key (prefer over wiping all buckets). */
export function clearRateLimitKey(key: string) {
  buckets.delete(key);
}

/** Test helper — clear every in-memory bucket. */
export function clearRateLimitBuckets() {
  buckets.clear();
}