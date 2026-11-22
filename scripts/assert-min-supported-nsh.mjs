/**
 * Assert packaging/windows/min-supported.nsh SHIELD_MIN_SUPPORTED matches
 * shared/desktop-downloads.json minSupportedVersion.
 *
 *   node scripts/assert-min-supported-nsh.mjs
 *   REQUIRE_NSH=1 node scripts/assert-min-supported-nsh.mjs   # fail if nsh missing
 *
 * Soft-skip (exit 0) when nsh absent unless REQUIRE_NSH=1.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const requireNsh = String(process.env.REQUIRE_NSH || "").trim() === "1";
const nshPath = path.join(root, "desktop-app/packaging/windows/min-supported.nsh");
const downloads = JSON.parse(
  readFileSync(path.join(root, "shared/desktop-downloads.json"), "utf8")
);
const minJson = String(downloads.minSupportedVersion || "").trim();

if (!minJson) {
  console.error("[assert-min-supported-nsh] desktop-downloads.json minSupportedVersion empty");
  process.exit(1);
}

if (!existsSync(nshPath)) {
  if (requireNsh) {
    console.error(
      `[assert-min-supported-nsh] missing ${nshPath} (run npm run pack:windows-stage first)`
    );
    process.exit(1);
  }
  console.log("[assert-min-supported-nsh] min-supported.nsh absent — skip");
  process.exit(0);
}

const nsh = readFileSync(nshPath, "utf8");
const expected = `!define SHIELD_MIN_SUPPORTED "${minJson}"`;
if (!nsh.includes(expected)) {
  console.error(
    `[assert-min-supported-nsh] expected ${expected} in min-supported.nsh\n--- file ---\n${nsh}`
  );
  process.exit(1);
}

console.log(`[assert-min-supported-nsh] OK min=${minJson}`);
