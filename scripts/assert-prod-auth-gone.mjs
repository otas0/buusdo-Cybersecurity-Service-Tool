/**
 * Spot-check production Account-sync routes return 410 Gone.
 *
 *   npm run assert:prod-auth-gone
 *   npm run assert:prod-auth-gone -- --url https://buusdocst.mtsu.workers.dev
 *
 * Laptop CF timeouts are common — prefer Actions ubuntu or a CF-reachable browser.
 */
const base = (
  process.argv.find((a) => a.startsWith("http")) ||
  process.env.PRODUCTION_HEALTH_URL ||
  "https://buusdocst.mtsu.workers.dev"
).replace(/\/$/, "");

const checks = [
  ["GET", "/api/auth/session"],
  ["POST", "/api/auth/magic/request"],
  ["POST", "/api/auth/magic/consume"],
  ["POST", "/api/auth/refresh"],
  ["POST", "/api/auth/device/exchange"],
  ["POST", "/api/auth/logout"],
  ["GET", "/api/auth/account"],
  ["DELETE", "/api/auth/account"],
  ["GET", "/api/sync/lists"],
  ["PUT", "/api/sync/lists"],
];

let failed = false;
for (const [method, path] of checks) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: { accept: "application/json", "content-type": "application/json" },
      body: ["GET", "HEAD", "DELETE"].includes(method) ? undefined : "{}",
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    let error = "";
    try {
      error = String(JSON.parse(text)?.error || "");
    } catch {
      error = "";
    }
    if (res.status !== 410 || error !== "account-sync-cancelled") {
      console.error(
        `[assert-prod-auth-gone] FAIL ${method} ${path} → ${res.status} error=${error || text.slice(0, 80)}`,
      );
      failed = true;
    } else {
      console.info(`[assert-prod-auth-gone] OK ${method} ${path} → 410`);
    }
  } catch (err) {
    console.error(
      `[assert-prod-auth-gone] FAIL ${method} ${path}:`,
      err instanceof Error ? err.message : err,
    );
    failed = true;
  }
}

if (failed) {
  console.error(
    `[assert-prod-auth-gone] against ${base} — if local TCP timeouts, re-run from Actions / CF-reachable host`,
  );
  process.exit(1);
}
console.info(`[assert-prod-auth-gone] OK all cancelled routes → 410 (${base})`);
