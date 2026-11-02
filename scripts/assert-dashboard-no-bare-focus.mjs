/**
 * Fail if dashboard.css, ops timeline, or desktop index.html inline CSS
 * regain bare :focus (mouse outline noise). :focus-visible is allowed.
 *
 *   node scripts/assert-dashboard-no-bare-focus.mjs
 *
 * Fixture overrides (tests only):
 *   SHIELD_FOCUS_GATE_INDEX_HTML / SHIELD_FOCUS_GATE_OPS_HTML
 *   SHIELD_FOCUS_GATE_FIXTURE_DIR — dir with index.html + home-continue-timeline.html
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { extractStyleBlocks, findBareFocus } from "./lib/focus-gate.mjs";

function defaultTargets() {
  const fixtureDir = process.env.SHIELD_FOCUS_GATE_FIXTURE_DIR
    ? path.resolve(process.env.SHIELD_FOCUS_GATE_FIXTURE_DIR)
    : null;
  const indexHtml =
    process.env.SHIELD_FOCUS_GATE_INDEX_HTML ||
    (fixtureDir ? path.join(fixtureDir, "index.html") : null) ||
    path.resolve("desktop-app/public/index.html");
  const opsHtml =
    process.env.SHIELD_FOCUS_GATE_OPS_HTML ||
    (fixtureDir ? path.join(fixtureDir, "home-continue-timeline.html") : null) ||
    path.resolve("ops/home-continue-timeline.html");
  return [
    { label: "dashboard.css", path: path.resolve("desktop-app/public/css/dashboard.css"), kind: "css" },
    {
      label: "ops/home-continue-timeline.html",
      path: path.resolve(opsHtml),
      kind: "html"
    },
    {
      label: "desktop-app/public/index.html",
      path: path.resolve(indexHtml),
      kind: "html"
    }
  ];
}

export function runFocusGate(fileTargets = defaultTargets()) {
  const bare = [];
  for (const t of fileTargets) {
    if (!existsSync(t.path)) {
      throw new Error(`missing ${t.path}`);
    }
    const raw = readFileSync(t.path, "utf8");
    const css = t.kind === "html" ? extractStyleBlocks(raw) : raw;
    // HTML with no <style> blocks is fine (gate stays quiet until inline CSS appears).
    if (t.kind === "html" && !css.trim()) continue;
    bare.push(...findBareFocus(css, t.label));
  }
  return bare;
}

function main() {
  let bare;
  try {
    bare = runFocusGate();
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
  if (bare.length) {
    console.error("bare :focus found (use :focus-visible only):");
    for (const s of bare) console.error(`  ${s}`);
    process.exit(1);
  }
  console.log(
    "focus gate: no bare :focus in dashboard.css + ops timeline + index.html inline CSS ok"
  );
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) main();