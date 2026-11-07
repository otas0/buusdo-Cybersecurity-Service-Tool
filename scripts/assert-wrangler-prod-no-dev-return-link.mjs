/**
 * Account sync cancelled — no Worker may set ACCOUNT_SYNC_DEV_RETURN_LINK=1,
 * and ACCOUNT_SYNC_ENABLED must stay "0" on prod + staging.
 *
 *   node scripts/assert-wrangler-prod-no-dev-return-link.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const raw = readFileSync(path.join(process.cwd(), "wrangler.jsonc"), "utf8");
const noLineComments = raw.replace(/^\s*\/\/.*$/gm, "");

if (/ACCOUNT_SYNC_DEV_RETURN_LINK\s*"\s*:\s*"1"/.test(noLineComments)) {
  console.error(
    "FAIL: ACCOUNT_SYNC_DEV_RETURN_LINK=1 is forbidden (Account sync product cancelled)"
  );
  process.exit(1);
}

const enabledOnes = [...noLineComments.matchAll(/"ACCOUNT_SYNC_ENABLED"\s*:\s*"([^"]*)"/g)];
if (!enabledOnes.length) {
  console.error("FAIL: wrangler.jsonc must declare ACCOUNT_SYNC_ENABLED");
  process.exit(1);
}
for (const m of enabledOnes) {
  if (m[1] !== "0") {
    console.error(
      `FAIL: ACCOUNT_SYNC_ENABLED must stay "0" (found "${m[1]}") — Account sync cancelled`
    );
    process.exit(1);
  }
}

console.log("assert-wrangler-prod-no-dev-return-link ok (sync cancelled)");
