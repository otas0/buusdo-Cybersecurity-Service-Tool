/**
 * China Pages wordmark/logo must match Workers/public brand assets (hash + size).
 *
 *   node scripts/assert-china-wordmark-parity.mjs
 */
import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pairs = [
  ["public/brand/buusdo-wordmark.png", "china-pages/assets/buusdo-wordmark.png"],
  ["public/brand/buusdo-logo.png", "china-pages/assets/buusdo-logo.png"]
];

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

for (const [aRel, bRel] of pairs) {
  const aPath = join(root, aRel);
  const bPath = join(root, bRel);
  const a = readFileSync(aPath);
  const b = readFileSync(bPath);
  const aStat = statSync(aPath);
  const bStat = statSync(bPath);
  if (aStat.size !== bStat.size) {
    console.error(
      `[assert-china-wordmark-parity] size mismatch ${aRel} (${aStat.size}) vs ${bRel} (${bStat.size})`
    );
    process.exit(1);
  }
  const ha = sha256(a);
  const hb = sha256(b);
  if (ha !== hb) {
    console.error(
      `[assert-china-wordmark-parity] hash mismatch ${aRel} (${ha.slice(0, 12)}…) vs ${bRel} (${hb.slice(0, 12)}…)`
    );
    process.exit(1);
  }
  console.info(
    `[assert-china-wordmark-parity] OK ${aRel} ↔ ${bRel} (${aStat.size} bytes, ${ha.slice(0, 12)}…)`
  );
}
