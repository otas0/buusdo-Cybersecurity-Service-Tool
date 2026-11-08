/**
 * Soft-live Go button regex must match `go` labels for locales in the live Halt matrix.
 *
 *   npx tsx --test tests/soft-live-go-pack-parity.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";
import { SOFT_LIVE_GO_BUTTON_NAME } from "../playwright/helpers/soft-live-go-button";

/** Locales exercised by playwright/risk-result-zh-hans-evidence.spec.ts live describe. */
const SOFT_LIVE_LOCALE_IDS = [
  "zh-Hans",
  "de",
  "th",
  "af",
  "zu",
  "fr",
  "es",
  "it",
  "nl",
  "lt",
  "lv",
  "et",
  "cs",
  "el",
  "ca",
  "sl",
  "uk",
  "is",
  "ga",
  "mt"
] as const;

test("SOFT_LIVE_GO_BUTTON_NAME matches every soft-live pack go label", () => {
  const missing: string[] = [];
  for (const id of SOFT_LIVE_LOCALE_IDS) {
    const p = `i18n/packs/${id}.json`;
    assert.ok(existsSync(p), `missing pack ${p}`);
    const pack = JSON.parse(readFileSync(p, "utf8")) as { go?: string };
    const go = String(pack.go || "").trim();
    assert.ok(go, `${id}.go empty`);
    if (!SOFT_LIVE_GO_BUTTON_NAME.test(go)) {
      missing.push(`${id}=${go}`);
    }
  }
  assert.deepEqual(
    missing,
    [],
    `Add pack go labels to playwright/helpers/soft-live-go-button.ts: ${missing.join(", ")}`
  );
});

test("SOFT_LIVE_GO_BUTTON_NAME still matches EN Go/Run", () => {
  assert.match("Go", SOFT_LIVE_GO_BUTTON_NAME);
  assert.match("Run", SOFT_LIVE_GO_BUTTON_NAME);
});
