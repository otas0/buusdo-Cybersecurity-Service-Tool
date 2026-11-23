/**
 * Keep shared/min-supported-floor.mjs linked from:
 *   - security/min-supported-floor.ts (re-export)
 *   - desktop-app/public/js/dashboard.js (ESM import)
 *   - components/MinSupportedFloorNote.tsx (via security re-export)
 *
 *   node scripts/assert-min-supported-floor-linked.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function mustInclude(rel, needle, label) {
  const src = readFileSync(path.join(root, rel), "utf8");
  if (!src.includes(needle)) {
    console.error(`[assert-min-supported-floor-linked] ${label}: ${rel} missing ${needle}`);
    failed += 1;
  }
}

mustInclude(
  "security/min-supported-floor.ts",
  'from "../shared/min-supported-floor.mjs"',
  "security TS re-export"
);
mustInclude(
  "desktop-app/public/js/dashboard.js",
  'from "/shared/min-supported-floor.mjs"',
  "dashboard ESM import"
);
mustInclude(
  "components/MinSupportedFloorNote.tsx",
  'from "../security/min-supported-floor"',
  "MinSupportedFloorNote → security"
);
mustInclude(
  "shared/min-supported-floor.mjs",
  "formatMinSupportedFloorNote",
  "shared helper export"
);

if (failed) {
  process.exit(1);
}
console.log("[assert-min-supported-floor-linked] OK (security + dashboard + MinSupportedFloorNote)");
