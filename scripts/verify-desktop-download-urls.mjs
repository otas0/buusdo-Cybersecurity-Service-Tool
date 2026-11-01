/**
 * HEAD-check desktop download URLs from shared/desktop-downloads.json.
 * Soft by default: 404 / network errors warn and exit 0 (first publish may lag).
 * Strict: VERIFY_DESKTOP_DOWNLOADS_STRICT=1 → non-zero on any failure.
 * --write-effective: promote macosAppZipUrl to notarized only when HEAD returns 200.
 *
 *   npm run verify:desktop-downloads
 *   node scripts/verify-desktop-download-urls.mjs --write-effective
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const strict = process.env.VERIFY_DESKTOP_DOWNLOADS_STRICT === "1";
const writeEffective = process.argv.includes("--write-effective");
const jsonPath = path.join(root, "shared/desktop-downloads.json");
const json = JSON.parse(readFileSync(jsonPath, "utf8"));

const mirrors = json.mirrors && typeof json.mirrors === "object" ? json.mirrors : {};
const fixtureMirrorStale = process.argv.includes("--fixture=mirror-stale");
const fixtureNotarized404 = process.argv.includes("--fixture=notarized-404");

function pick(primary, mirror) {
  const m = String(mirror || "").trim();
  if (m) return m;
  return String(primary || "").trim();
}

/** Soft-warn when CDN mirror fails but GitHub primary works (no hardFail in soft mode). */
function warnMirrorStale(mirrorResult, githubResult) {
  if (mirrorResult && !mirrorResult.ok && githubResult?.ok) {
    console.warn(
      "WARN mirror stale: CDN mirrors.macosAppZipUrl HEAD ≠ 200 but GitHub primary is 200 — soft; not failing soft mode"
    );
    return 1;
  }
  return 0;
}

/** Classify notarized HEAD for health-monitor (missing | ok | http-404 | unreachable | http-N). */
function classifyNotarizedKind(notarizedUrl, result) {
  if (!notarizedUrl) return "missing";
  if (result?.ok) return "ok";
  const status = result?.status;
  if (Number(status) === 404) return "http-404";
  if (!status || Number(status) === 0) return "unreachable";
  return `http-${status}`;
}

if (fixtureMirrorStale) {
  // Unit fixture: no live network — CDN fail + GitHub 200.
  const soft = warnMirrorStale(
    { ok: false, status: 503, url: "https://cdn.example.test/macos.zip" },
    { ok: true, status: 200, url: "https://github.example.test/macos.zip" }
  );
  if (soft !== 1) {
    console.error("fixture mirror-stale: expected soft-warn count 1");
    process.exit(1);
  }
  console.log("verify-desktop-download-urls: fixture mirror-stale ok (no network)");
  process.exit(0);
}

if (fixtureNotarized404) {
  // Fail-soft unit fixture: notarized URL present but HEAD 404 — never fails the job.
  const kind = classifyNotarizedKind("https://example.test/notarized.zip", {
    ok: false,
    status: 404
  });
  if (kind !== "http-404") {
    console.error(`fixture notarized-404: expected http-404, got ${kind}`);
    process.exit(1);
  }
  console.warn("ANNOTATE notarized HEAD ≠ 200 → kind=http-404 status=404 (soft — job must not fail)");
  console.log("DOWNLOAD_SOFT_WARN_COUNT=1");
  console.log("NOTARIZED_HEAD_OK=0");
  console.log("NOTARIZED_HEAD_KIND=http-404");
  console.log("NOTARIZED_HEAD_STATUS=404");
  console.log("verify-desktop-download-urls: fixture notarized-404 ok (soft; exit 0)");
  process.exit(0);
}

const notarized = String(json.macosAppZipUrlNotarized || "").trim();
const unsigned = String(json.macosAppZipUrlUnsigned || json.macosAppZipUrl || "").trim();

const macMirror = String(mirrors.macosAppZipUrl || "").trim();
const macPrimary = String(json.macosAppZipUrl || "").trim();
// Prefer CDN mirror HEAD before GitHub when mirrors.macosAppZipUrl is set.
const macEffective = macMirror || macPrimary;

const targets = [
  { key: "windowsNsisUrl", url: pick(json.windowsNsisUrl, mirrors.windowsNsisUrl) },
  { key: "linuxDebAmd64Url", url: pick(json.linuxDebAmd64Url, mirrors.linuxDebAmd64Url) }
];
if (macMirror) {
  targets.push({ key: "macosAppZipUrl (CDN mirror)", url: macMirror });
}
if (macPrimary && macPrimary !== macMirror) {
  targets.push({ key: "macosAppZipUrl (GitHub primary)", url: macPrimary });
} else if (macEffective && !macMirror) {
  targets.push({ key: "macosAppZipUrl (primary)", url: macEffective });
}

if (notarized) targets.push({ key: "macosAppZipUrlNotarized", url: notarized });
if (unsigned && unsigned !== notarized) targets.push({ key: "macosAppZipUrlUnsigned", url: unsigned });

async function headOk(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { Range: "bytes=0-0" }
      });
    }
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

let hardFail = 0;
let softWarn = 0;
const results = {};
for (const { key, url } of targets) {
  if (!url) {
    console.log(`SKIP ${key} (empty)`);
    continue;
  }
  const result = await headOk(url);
  results[key] = { ...result, url };
  if (result.ok) {
    console.log(`OK   ${key} → ${result.status} ${url}`);
    continue;
  }
  const detail = result.error || `HTTP ${result.status}`;
  softWarn += 1;
  console.warn(`WARN ${key} → ${detail}${result.status === 404 || result.status === 0 ? " (soft; publish may not exist yet)" : ""} ${url}`);
  if (strict) hardFail += 1;
}

// Soft-warn when CDN mirror is set but stale while GitHub primary still works.
const mirrorResult = results["macosAppZipUrl (CDN mirror)"];
const githubResult = results["macosAppZipUrl (GitHub primary)"] || results["macosAppZipUrl (primary)"];
if (macMirror) {
  softWarn += warnMirrorStale(mirrorResult, githubResult);
}

if (writeEffective && notarized) {
  const n = results.macosAppZipUrlNotarized || (await headOk(notarized));
  if (n.ok) {
    json.macosAppZipUrl = notarized;
    console.log(`write-effective: macosAppZipUrl → notarized (HEAD ${n.status})`);
    if (macMirror) console.log("CDN mirror preferred for HEAD checks when set (mirrors.macosAppZipUrl)");
  } else if (unsigned) {
    json.macosAppZipUrl = unsigned;
    console.log("write-effective: notarized not 200 — macosAppZipUrl stays/falls back to unsigned");
  }
  writeFileSync(jsonPath, `${JSON.stringify(json, null, 2)}\n`);
} else if (notarized) {
  const n = results.macosAppZipUrlNotarized;
  if (n?.ok) {
    console.log("prefer notarized: HEAD 200 — run --write-effective to set macosAppZipUrl primary");
  } else {
    console.log("prefer notarized: deferred until STRICT/HEAD 200 (primary may be unsigned)");
  }
}

const notarizedResult = results.macosAppZipUrlNotarized;
const notarizedOk = Boolean(notarizedResult?.ok);
const notarizedStatus = notarizedResult ? notarizedResult.status : "";
const notarizedKind = classifyNotarizedKind(notarized, notarizedResult);
if (notarized && notarizedResult && !notarizedOk) {
  console.warn(
    `ANNOTATE notarized HEAD ≠ 200 → kind=${notarizedKind} status=${notarizedStatus || 0} (soft — job must not fail)`
  );
}

// Machine-readable lines for health-monitor (soft Slack / summary).
console.log(`DOWNLOAD_SOFT_WARN_COUNT=${softWarn}`);
console.log(`NOTARIZED_HEAD_OK=${notarizedOk ? "1" : notarized ? "0" : "skip"}`);
console.log(`NOTARIZED_HEAD_KIND=${notarizedKind}`);
if (notarized) console.log(`NOTARIZED_HEAD_STATUS=${notarizedStatus || 0}`);

if (hardFail) {
  console.error(`verify-desktop-download-urls: ${hardFail} failure(s) in STRICT mode`);
  process.exit(1);
}
console.log(
  softWarn
    ? `verify-desktop-download-urls: ${softWarn} soft warning(s) — exit 0`
    : "verify-desktop-download-urls: all reachable"
);
