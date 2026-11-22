#!/usr/bin/env node
/**
 * Scaffold: parse path hit counts for China Pages install/privacy stubs.
 *
 * When custom-domain Logpush (or Pages analytics export) exists, feed a dump
 * and decide whether thin redirects can be deleted (≥30 days near-zero).
 *
 * Supported dump shapes (first matching parser wins):
 *   1. JSON lines: {"path":"/install.html","count":12} or {"ClientRequestURI":"...","EdgeResponseStatus":200}
 *   2. CSV with path,count headers
 *   3. Plain lines:  "/install.html  12"
 *
 *   node scripts/parse-china-stub-path-counts.mjs --dump /path/to/log.jsonl
 *   node scripts/parse-china-stub-path-counts.mjs --dump ./fixture.csv --days 30
 *
 * Exit 0 always when dump parses; prints GATE=keep|review. Exit 2 if dump missing.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const STUBS = [
  "/install.html",
  "/install-en.html",
  "/privacy.html",
  "/privacy-en.html"
];

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? String(args[i + 1] || "").trim() : "";
}

const dumpPath = flag("dump");
const days = Number.parseInt(flag("days") || "30", 10) || 30;
const nearZero = Number.parseInt(flag("near-zero") || "5", 10) || 5;

if (!dumpPath) {
  console.log(`Usage: node scripts/parse-china-stub-path-counts.mjs --dump <file> [--days ${days}] [--near-zero ${nearZero}]`);
  console.log("Paths counted:", STUBS.join(", "));
  console.log("GATE=keep until a dump shows near-zero hits for ≥ --days (document only; this script does not delete).");
  process.exit(0);
}

const abs = resolve(dumpPath);
if (!existsSync(abs)) {
  console.error(`FAIL: dump not found: ${abs}`);
  process.exit(2);
}

const raw = readFileSync(abs, "utf8");
/** @type {Record<string, number>} */
const counts = Object.fromEntries(STUBS.map((p) => [p, 0]));

function bump(pathLike, n = 1) {
  if (!pathLike) return;
  let path = String(pathLike).split("?")[0];
  try {
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
  } catch {
    /* keep */
  }
  // Strip Pages project prefix if present: /buusdocst/install.html → /install.html
  path = path.replace(/^\/buusdocst(?=\/)/, "");
  if (!path.startsWith("/")) path = `/${path}`;
  if (path in counts) counts[path] += Number(n) || 1;
}

const lines = raw.split(/\r?\n/).filter((l) => l.trim());
let mode = "unknown";

if (lines[0] && /path\s*,\s*count/i.test(lines[0])) {
  mode = "csv";
  for (const line of lines.slice(1)) {
    const [p, c] = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
    bump(p, Number(c) || 0);
  }
} else if (lines.some((l) => l.trim().startsWith("{"))) {
  mode = "jsonl";
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    try {
      const row = JSON.parse(t);
      const p =
        row.path ||
        row.ClientRequestPath ||
        row.ClientRequestURI ||
        row.uri ||
        row.url ||
        "";
      const n = row.count ?? row.EdgeResponseBytes ?? row.hits ?? 1;
      bump(p, typeof n === "number" && row.count != null ? n : 1);
    } catch {
      /* skip bad line */
    }
  }
} else {
  mode = "plain";
  for (const line of lines) {
    const m = line.trim().match(/^(\S+)\s+(\d+)\s*$/);
    if (m) bump(m[1], Number(m[2]));
  }
}

console.log(`dump=${abs}`);
console.log(`parser=${mode}`);
console.log(`window_days=${days} (caller responsibility — dump should cover this window)`);
for (const p of STUBS) {
  console.log(`count ${p}=${counts[p]}`);
}

const max = Math.max(...Object.values(counts));
const allNearZero = Object.values(counts).every((c) => c <= nearZero);
const gate = allNearZero ? "review" : "keep";
console.log(`max_stub_hits=${max}`);
console.log(`near_zero_threshold=${nearZero}`);
console.log(`GATE=${gate}`);
if (gate === "review") {
  console.log(
    "All stub paths ≤ threshold for this dump — open a PR to delete thin redirects only after confirming the dump covers ≥30 days (see docs/CHINA_GITHUB_PAGES.md)."
  );
} else {
  console.log("Keep install/privacy stubs — path hits above near-zero (or dump incomplete).");
}
