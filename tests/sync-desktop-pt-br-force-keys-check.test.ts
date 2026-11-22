/**
 * sync-desktop --check must keep pt-BR bag force/update keys (desktop-only, not in MAP).
 *
 *   npx tsx --test tests/sync-desktop-pt-br-force-keys-check.test.ts
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(".");
const FORCE_KEYS = [
  "forceUpdateKicker",
  "forceUpdateTitle",
  "forceUpdateBody",
  "forceUpdateDownload",
  "forceUpdateAfterDownload",
  "forceUpdateSetupGuide",
  "optionalUpdateBanner",
  "optionalUpdateDismiss",
  "optionalUpdateShowHint",
  "updateCheckOffline",
  "honestLimitsItemOffline"
] as const;

function extractBag(src: string, id: string): Record<string, string> | null {
  const re = new RegExp(`STRINGS\\[${JSON.stringify(id)}\\] = (\\{[\\s\\S]*?\\n\\});`);
  const m = src.match(re);
  if (!m) return null;
  try {
    return Function(`"use strict"; return (${m[1]});`)() as Record<string, string>;
  } catch {
    return null;
  }
}

const NORDIC_EUROPE = ["sv", "da", "fi", "nb", "de", "fr", "es", "it", "nl"] as const;

test("sync-desktop --check passes and pt-BR/ja/zh-Hant + Nordic/Europe retain force keys", () => {
  execFileSync(process.execPath, ["scripts/sync-desktop-i18n-from-packs.mjs", "--check"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const src = readFileSync(path.join(root, "desktop-app/public/js/i18n.js"), "utf8");
  for (const locale of ["pt-BR", "ja", "zh-Hant", ...NORDIC_EUROPE] as const) {
    const bag = extractBag(src, locale);
    assert.ok(bag, `missing STRINGS[${locale}]`);
    for (const key of FORCE_KEYS) {
      assert.ok(bag![key]?.trim(), `${locale} missing force/update key ${key} after --check`);
    }
  }
});
