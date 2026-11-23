/**
 * must-stay-full packs must not leave extensionStoreOnlyNote as EN.
 *
 *   npx tsx --test tests/extension-store-only-soft-live.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { getMessages } from "../i18n/messages";
import mustStayFullRaw from "../i18n/must-stay-full-locales.json";

const SPOT = (
  Array.isArray(mustStayFullRaw)
    ? mustStayFullRaw
    : (mustStayFullRaw as { locales: string[] }).locales
) as string[];

test("must-stay-full locales: extensionStoreOnlyNote differs from EN", () => {
  const en = getMessages("en").extensionStoreOnlyNote;
  assert.ok(en?.trim(), "EN extensionStoreOnlyNote");
  const bad: string[] = [];
  for (const id of SPOT) {
    const packPath = path.join("i18n/packs", `${id}.json`);
    const pack = JSON.parse(readFileSync(packPath, "utf8")) as Record<string, string>;
    const val = pack.extensionStoreOnlyNote?.trim() || getMessages(id).extensionStoreOnlyNote;
    if (!val?.trim()) {
      bad.push(`${id}:missing`);
      continue;
    }
    if (val === en) bad.push(`${id}:still-EN`);
  }
  assert.equal(bad.length, 0, bad.join("\n"));
});
