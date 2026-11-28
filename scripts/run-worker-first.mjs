/**
 * vinext Cloudflare Assets: boolean `run_worker_first: true` sends
 * /_next/static through the Worker and 404s CSS/JS.
 *
 * Pattern list:
 * - HTML / API / most paths → Worker first (CN wrap + vinext)
 * - Hashed build output + public binaries → Assets directly
 *   (routing brand/favicon through the Worker has returned content-length:0)
 *
 * @see https://vinext.dev/docs/deploying/cloudflare
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
];

export function isValidRunWorkerFirst(value) {
  return (
    Array.isArray(value) &&
    value.includes("/*") &&
    value.includes("!/_next/static/*") &&
    value.includes("!/*/_next/static/*") &&
    value.includes("!/brand/*")
  );
}
