import assert from "node:assert/strict";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";

test("extension mi/th/vi tables cover every EN key", async () => {
  const mod = await import(pathToFileURL(path.resolve("extension/shared/i18n.js")).href);
  const { STRINGS, normalizeUiLang } = mod;
  const en = STRINGS.en;
  for (const id of ["mi", "th", "vi"] as const) {
    assert.equal(normalizeUiLang(id), id);
    const bag = STRINGS[id];
    assert.ok(bag, `missing ${id}`);
    for (const key of Object.keys(en)) {
      assert.ok(bag[key]?.toString().trim(), `${id} missing ${key}`);
    }
    assert.notEqual(bag.scan, en.scan);
    assert.notEqual(bag.listsTitle, en.listsTitle);
  }
});
