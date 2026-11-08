import assert from "node:assert/strict";
import { test } from "node:test";
import { localeFromAcceptLanguage } from "../lib/accept-language";

test("localeFromAcceptLanguage prefers higher q", () => {
  assert.equal(localeFromAcceptLanguage("en;q=0.8, zh-CN;q=0.9, pt-PT;q=0.5"), "zh-Hans");
  assert.equal(localeFromAcceptLanguage("pt-PT;q=0.4, ja;q=0.9, en;q=1"), "ja");
});

test("localeFromAcceptLanguage skips en and returns next shipped locale", () => {
  assert.equal(localeFromAcceptLanguage("en-US,en;q=0.9,de;q=0.8"), "de");
  assert.equal(localeFromAcceptLanguage("en"), null);
});

test("localeFromAcceptLanguage maps aliases", () => {
  assert.equal(localeFromAcceptLanguage("zh-TW"), "zh-Hant");
  assert.equal(localeFromAcceptLanguage("jp"), "ja");
  assert.equal(localeFromAcceptLanguage("tl;q=0.9"), "fil");
});

test("localeFromAcceptLanguage empty / junk → null", () => {
  assert.equal(localeFromAcceptLanguage(""), null);
  assert.equal(localeFromAcceptLanguage(null), null);
  assert.equal(localeFromAcceptLanguage("xx-YY"), null);
});
