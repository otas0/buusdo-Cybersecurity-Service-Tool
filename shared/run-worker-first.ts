/**
 * vinext Cloudflare Assets: boolean `run_worker_first: true` 404s /_next/static.
 * Keep in sync with scripts/run-worker-first.mjs (wrap + assert).
 */
export const RUN_WORKER_FIRST = [
  "/*",
  "!/_next/static/*",
  "!/*/_next/static/*",
  "!/brand/*",
  "!/promo/*",
  "!/assets/*",
  "!/favicon.png",
  "!/favicon.svg",
  "!/og.png"
] as const;
