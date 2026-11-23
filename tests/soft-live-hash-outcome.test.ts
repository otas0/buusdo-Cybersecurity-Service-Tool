/**
 * Soft-live hash in-view outcome helpers (streak reset marker).
 *
 *   npx tsx --test tests/soft-live-hash-outcome.test.ts
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

test("soft-live-hash-outcome reset / ok / fail", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "soft-live-outcome-"));
  const out = path.join(dir, "outcome.json");
  process.env.SOFT_LIVE_HASH_OUTCOME_PATH = out;
  try {
    const mod = await import("../playwright/helpers/soft-live-hash-outcome.ts");
    assert.equal(mod.softLiveHashOutcomePath(), out);

    mod.softLiveHashOutcomeReset();
    let data = JSON.parse(readFileSync(out, "utf8"));
    assert.equal(data.ok, true);
    assert.deepEqual(data.fails, []);
    assert.deepEqual(data.oks, []);

    mod.softLiveHashInViewOk("en", "#downloads-extension");
    data = JSON.parse(readFileSync(out, "utf8"));
    assert.equal(data.ok, true);
    assert.deepEqual(data.oks, [{ locale: "en", id: "#downloads-extension" }]);

    mod.softLiveHashInViewFail("pt-PT", "#privacy-honest-limits", "not in view");
    data = JSON.parse(readFileSync(out, "utf8"));
    assert.equal(data.ok, false);
    assert.equal(data.fails.length, 1);
    assert.equal(data.fails[0].locale, "pt-PT");
    assert.equal(data.fails[0].id, "#privacy-honest-limits");
    assert.match(data.fails[0].msg, /not in view/);

    mod.softLiveHashOutcomeReset();
    data = JSON.parse(readFileSync(out, "utf8"));
    assert.equal(data.ok, true);
    assert.deepEqual(data.fails, []);
    assert.deepEqual(data.oks, []);
  } finally {
    delete process.env.SOFT_LIVE_HASH_OUTCOME_PATH;
    rmSync(dir, { recursive: true, force: true });
  }
});
