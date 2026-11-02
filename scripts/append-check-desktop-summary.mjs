/**
 * Append check:desktop tsx line to GITHUB_STEP_SUMMARY when set.
 * Soft-warn (exit 0) if the summary parent path cannot be created (e.g. /dev/null/…).
 *
 *   node scripts/append-check-desktop-summary.mjs
 */

import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const line =
  "check:desktop tsx: tests/focus-gate-bare-focus.test.ts tests/spa-replace-state-hashchange.test.ts tests/home-continue-stamp-tag-only.test.ts";

if (process.env.GITHUB_ACTIONS === "true") {
  console.log(line);
}

const s = process.env.GITHUB_STEP_SUMMARY;
if (s) {
  try {
    mkdirSync(path.dirname(path.resolve(s)), { recursive: true });
    appendFileSync(s, `## check:desktop\n\n${line}\n`);
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? e.message : e;
    console.warn("check:desktop: GITHUB_STEP_SUMMARY mkdir/append soft-fail:", msg);
  }
}