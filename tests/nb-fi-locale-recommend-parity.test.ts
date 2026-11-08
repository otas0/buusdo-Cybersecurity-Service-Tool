/**
 * nb/fi LocaleRecommend accept/dismiss copy parity (localized, keeps {lang}).
 *
 *   npx tsx --test tests/nb-fi-locale-recommend-parity.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { getMessages } from "../i18n/messages";

for (const id of ["nb", "fi"] as const) {
  test(`${id} LocaleRecommend accept/dismiss differ from EN and keep {lang}`, () => {
    const pack = JSON.parse(readFileSync(path.join("i18n/packs", `${id}.json`), "utf8")) as Record<
      string,
      string
    >;
    const en = getMessages("en");
    const bag = getMessages(id);

    assert.ok(pack.localeRecommendTitle?.trim());
    assert.ok(pack.localeRecommendBody?.includes("{lang}"));
    assert.ok(pack.localeRecommendAccept?.includes("{lang}"));
    assert.ok(pack.localeRecommendDismiss?.trim());

    assert.notEqual(bag.localeRecommendTitle, en.localeRecommendTitle);
    assert.notEqual(bag.localeRecommendBody, en.localeRecommendBody);
    assert.notEqual(bag.localeRecommendAccept, en.localeRecommendAccept);
    assert.notEqual(bag.localeRecommendDismiss, en.localeRecommendDismiss);

    assert.equal(
      (bag.localeRecommendBody.match(/\{lang\}/g) || []).length,
      (en.localeRecommendBody.match(/\{lang\}/g) || []).length,
    );
    assert.equal(
      (bag.localeRecommendAccept.match(/\{lang\}/g) || []).length,
      (en.localeRecommendAccept.match(/\{lang\}/g) || []).length,
    );
  });
}
