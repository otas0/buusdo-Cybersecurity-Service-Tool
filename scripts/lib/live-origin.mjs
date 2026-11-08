/**
 * Shared live-origin resolution for soft post-deploy probes.
 * Prefer explicit LIVE → PRODUCTION → STAGING → PREVIEW.
 */
export function trimBase(url) {
  return String(url || "")
    .trim()
    .replace(/\/$/, "");
}

/** Ordered unique candidate origins (env). */
export function liveOriginCandidates() {
  const raw = [
    process.env.PLAYWRIGHT_LIVE_BASE_URL,
    process.env.PRODUCTION_HEALTH_URL,
    process.env.STAGING_HEALTH_URL,
    process.env.PLAYWRIGHT_PREVIEW_BASE_URL
  ];
  const out = [];
  const seen = new Set();
  for (const u of raw) {
    const b = trimBase(u);
    if (!b || seen.has(b)) continue;
    seen.add(b);
    out.push(b);
  }
  return out;
}

export function healthTimeoutMs() {
  const n = Number(process.env.HEALTH_TIMEOUT_MS || 8_000);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 8_000;
}

export function localeTimeoutMs() {
  const n = Number(process.env.LOCALE_TIMEOUT_MS || 12_000);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 12_000;
}

/**
 * curl -w style probe row for job summaries.
 */
export async function probeHealth(base, timeoutMs = healthTimeoutMs()) {
  const url = `${trimBase(base)}/api/health`;
  const started = performance.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json" }
    });
    const time_total = ((performance.now() - started) / 1000).toFixed(3);
    let body;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    const ok = res.ok && body?.ok === true && body?.curatedListPresent === true;
    return {
      url,
      http_code: String(res.status),
      time_total,
      ok,
      body
    };
  } catch (err) {
    const time_total = ((performance.now() - started) / 1000).toFixed(3);
    const msg =
      err?.name === "TimeoutError" || /aborted|timeout/i.test(String(err?.message || err))
        ? "timeout"
        : String(err?.message || err);
    return {
      url,
      http_code: "000",
      time_total,
      err: msg,
      ok: false
    };
  }
}

/** First reachable origin among candidates (health ok + curatedListPresent). */
export async function resolveLiveOrigin() {
  const candidates = liveOriginCandidates();
  const probes = [];
  for (const base of candidates) {
    const row = await probeHealth(base);
    probes.push({ base, ...row });
    if (row.ok) return { base, probes };
  }
  return { base: "", probes };
}

/** Append markdown to GITHUB_STEP_SUMMARY when present. */
export async function appendStepSummaryAsync(markdown) {
  const p = process.env.GITHUB_STEP_SUMMARY;
  if (!p) return;
  const fs = await import("node:fs");
  fs.appendFileSync(p, `${markdown}\n`);
}

export function formatProbeTable(probes) {
  const lines = [
    "## Live origin probes",
    "",
    "| URL | http_code | time_total | result |",
    "| --- | ---: | ---: | --- |"
  ];
  for (const p of probes) {
    const result = p.ok ? "ok" : p.err || `http_${p.http_code}`;
    lines.push(`| \`${p.url}\` | ${p.http_code} | ${p.time_total}s | ${result} |`);
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * Run async mapper over items with a fixed worker pool.
 * Result array order matches input order (stable).
 */
export async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next;
      next += 1;
      out[i] = await fn(items[i], i);
    }
  }
  const n = Math.min(Math.max(1, limit), Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

/**
 * Optional timeout webhook (opt-in). Distinct from skipped SLACK_WEBHOOK_URL.
 */
export async function maybeTimeoutWebhook(payload) {
  const hook = String(process.env.WORKERS_TIMEOUT_WEBHOOK_URL || "").trim();
  if (!hook) return { sent: false, reason: "unset" };
  try {
    const res = await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8_000),
      body: JSON.stringify(payload)
    });
    return { sent: res.ok, reason: `http_${res.status}` };
  } catch (err) {
    return { sent: false, reason: String(err?.message || err) };
  }
}
