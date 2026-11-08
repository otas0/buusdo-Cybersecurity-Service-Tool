/**
 * Dead PROMO_ORIGIN must soft-skip (exit 0), not hard-fail.
 *
 *   npx tsx --test tests/promo-privacy-routes-soft-skip.test.ts
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";

const root = process.cwd();
const script = path.join(root, "scripts/assert-promo-privacy-routes.mjs");

test("assert:promo-privacy-routes soft-skips unreachable PROMO_ORIGIN", () => {
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      // Closed local port — immediate refuse (soft-skip, not hang).
      PROMO_ORIGIN: "http://127.0.0.1:1",
    },
    timeout: 60_000,
  });
  const out = `${result.stdout || ""}\n${result.stderr || ""}`;
  assert.equal(result.status, 0, out);
  assert.match(out, /soft-skip/i, out);
});
