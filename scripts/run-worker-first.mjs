/**
 * vinext Cloudflare Assets: boolean `run_worker_first: true` sends
 * /_next/static through the Worker and 404s CSS/JS.
 * Use this pattern list so CN wrap still runs for pages while Assets
 * serves hashed build output directly.
 *
 * @see https://vinext.dev/docs/deploying/cloudflare
 */
export const RUN_WORKER_FIRST = ["/*", "!/_next/static/*", "!/*/_next/static/*"];

export function isValidRunWorkerFirst(value) {
  return (
    Array.isArray(value) &&
    value.includes("/*") &&
    value.includes("!/_next/static/*") &&
    value.includes("!/*/_next/static/*")
  );
}
