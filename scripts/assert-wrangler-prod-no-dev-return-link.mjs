/**
 * Top-level (prod) wrangler vars must never enable ACCOUNT_SYNC_DEV_RETURN_LINK.
 * Staging may set it under env.staging only.
 *
 *   node scripts/assert-wrangler-prod-no-dev-return-link.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const raw = readFileSync(path.join(process.cwd(), "wrangler.jsonc"), "utf8");
// Strip // comments for a coarse parse (vars blocks only).
const noLineComments = raw.replace(/^\s*\/\/.*$/gm, "");

const envIdx = noLineComments.indexOf('"env"');
const top = envIdx >= 0 ? noLineComments.slice(0, envIdx) : noLineComments;
const staging =
  envIdx >= 0 ? noLineComments.slice(envIdx) : "";

if (/ACCOUNT_SYNC_DEV_RETURN_LINK\s*"\s*:\s*"1"/.test(top)) {
  console.error(
    "FAIL: top-level wrangler vars set ACCOUNT_SYNC_DEV_RETURN_LINK=1 — prod must never return magic links in JSON"
  );
  process.exit(1);
}
if (!/ACCOUNT_SYNC_DEV_RETURN_LINK\s*"\s*:\s*"1"/.test(staging)) {
  console.error(
    "FAIL: env.staging should set ACCOUNT_SYNC_DEV_RETURN_LINK=1 for staging magic-link smoke"
  );
  process.exit(1);
}
if (!/"ACCOUNT_SYNC_ENABLED"\s*:\s*"0"/.test(top)) {
  console.error("FAIL: top-level ACCOUNT_SYNC_ENABLED must stay \"0\" until Turso gate flips");
  process.exit(1);
}

console.log("assert-wrangler-prod-no-dev-return-link ok");