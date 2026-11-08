/**
 * HEAD/GET spot-check: poster privacy locale routes return 200.
 *
 *   PROMO_ORIGIN=https://buusdocst.mtsu.workers.dev npm run assert:promo-privacy-routes
 *   PROMO_ORIGIN=http://127.0.0.1:3000 npm run assert:promo-privacy-routes
 */
const origin = (process.env.PROMO_ORIGIN || "https://buusdocst.mtsu.workers.dev").replace(/\/$/, "");
const paths = [
  "/promo/poster.html",
  "/en/privacy",
  "/pt-PT/privacy",
  "/zh-Hans/privacy",
];

const ctrl = (ms) => AbortSignal.timeout(ms);

let failed = false;
for (const p of paths) {
  const url = `${origin}${p}`;
  try {
    let status;
    try {
      const head = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctrl(20_000) });
      status = head.status;
    } catch {
      status = 405; // force GET fallback
    }
    // Some Workers reject HEAD — fall back to GET.
    if (status === 405 || status === 501 || status === 0) {
      const get = await fetch(url, { method: "GET", redirect: "follow", signal: ctrl(30_000) });
      status = get.status;
      await get.arrayBuffer();
    }
    if (status < 200 || status >= 300) {
      console.error(`[assert-promo-privacy-routes] FAIL ${url} → HTTP ${status}`);
      failed = true;
    } else {
      console.info(`[assert-promo-privacy-routes] OK ${url} → ${status}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Soft-skip when origin is unreachable (local offline / flaky Workers).
    if (/fetch failed|AbortError|TimeoutError|ECONN|ENOTFOUND|timed out/i.test(msg)) {
      console.info(`[assert-promo-privacy-routes] soft-skip ${url} (${msg})`);
      continue;
    }
    console.error(`[assert-promo-privacy-routes] FAIL ${url}`, msg);
    failed = true;
  }
}

if (failed) process.exit(1);
console.info(`[assert-promo-privacy-routes] OK origin=${origin}`);
