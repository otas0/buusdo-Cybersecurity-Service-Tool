/**
 * Southern Africa extension bags: China notice/clear short links localized (not EN).
 *
 *   npx tsx --test tests/extension-sa-china-notice-links.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const src = readFileSync("extension/shared/i18n.js", "utf8");

function bagSlice(id: string): string {
  const m = src.match(new RegExp(`\\n  ${id}: \\{([\\s\\S]*?)\\n  \\},`));
  assert.ok(m, `missing STRINGS.${id}`);
  return m![1];
}

function key(bag: string, name: string): string {
  const m = bag.match(new RegExp(`"${name}":\\s*"((?:\\\\.|[^"\\\\])*)"`));
  assert.ok(m, `missing ${name}`);
  return m![1];
}

test("xh/st/nr/nso China notice/clear links differ from EN", () => {
  const en = bagSlice("en");
  // en bag may use unquoted keys
  const enNotice =
    key(en.replace(/(\w+):/g, '"$1":'), "websiteApiChinaNoticeLink") || "Open notice";
  void enNotice;
  const expect: Record<string, { notice: string; clear: string }> = {
    xh: { notice: "Vula isaziso", clear: "Susa ukuhlala" },
    st: { notice: "Bula tsebiso", clear: "Hlakola ho dula" },
    nr: { notice: "Vula isaziso", clear: "Susa ukuhlala" },
    nso: { notice: "Bula tsebišo", clear: "Phimola go dula" }
  };
  for (const [id, want] of Object.entries(expect)) {
    const bag = bagSlice(id);
    assert.equal(key(bag, "websiteApiChinaNoticeLink"), want.notice, id);
    assert.equal(key(bag, "websiteApiChinaStayClearLink"), want.clear, id);
    assert.notEqual(key(bag, "websiteApiChinaNoticeLink"), "Open notice", id);
    assert.notEqual(key(bag, "websiteApiChinaStayClearLink"), "Clear stay", id);
  }
});

test("extension-ui-locales catalog lists xh/st/nr/nso", () => {
  const catalog = JSON.parse(readFileSync("extension/shared/extension-ui-locales.json", "utf8")) as {
    order: string[];
  };
  for (const id of ["xh", "st", "nr", "nso"]) {
    assert.ok(catalog.order.includes(id), `missing ${id} in extension-ui-locales`);
  }
});
