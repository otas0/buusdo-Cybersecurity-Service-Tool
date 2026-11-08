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

test("localeFromAcceptLanguage SEA region tags and legacy codes", () => {
  assert.equal(localeFromAcceptLanguage("th-TH,en;q=0.8"), "th");
  assert.equal(localeFromAcceptLanguage("vi-VN;q=0.9"), "vi");
  assert.equal(localeFromAcceptLanguage("id-ID,en;q=0.5"), "id");
  assert.equal(localeFromAcceptLanguage("ind;q=0.9"), "id");
  assert.equal(localeFromAcceptLanguage("ms-MY;q=0.8"), "ms");
  assert.equal(localeFromAcceptLanguage("may;q=0.9"), "ms");
  assert.equal(localeFromAcceptLanguage("km-KH,en;q=0.7"), "km");
  assert.equal(localeFromAcceptLanguage("kh;q=0.9"), "km");
  assert.equal(localeFromAcceptLanguage("lo-LA;q=0.9"), "lo");
  assert.equal(localeFromAcceptLanguage("lao;q=0.8"), "lo");
  assert.equal(localeFromAcceptLanguage("my-MM;q=0.9"), "my");
  assert.equal(localeFromAcceptLanguage("bur;q=0.9"), "my");
  assert.equal(localeFromAcceptLanguage("tl-PH;q=0.9"), "fil");
});

test("localeFromAcceptLanguage Southern Africa + Māori region tags", () => {
  assert.equal(localeFromAcceptLanguage("xh-ZA,en;q=0.5"), "xh");
  assert.equal(localeFromAcceptLanguage("zu-ZA;q=0.9"), "zu");
  assert.equal(localeFromAcceptLanguage("af-ZA;q=0.8"), "af");
  assert.equal(localeFromAcceptLanguage("nso-ZA;q=0.9"), "nso");
  assert.equal(localeFromAcceptLanguage("st-ZA;q=0.9"), "st");
  assert.equal(localeFromAcceptLanguage("tn-ZA;q=0.9"), "tn");
  assert.equal(localeFromAcceptLanguage("ss-ZA;q=0.9"), "ss");
  assert.equal(localeFromAcceptLanguage("ss-SZ;q=0.8"), "ss");
  assert.equal(localeFromAcceptLanguage("ve-ZA;q=0.9"), "ve");
  assert.equal(localeFromAcceptLanguage("ts-ZA;q=0.9"), "ts");
  assert.equal(localeFromAcceptLanguage("nr-ZA;q=0.9"), "nr");
  assert.equal(localeFromAcceptLanguage("nr-ZW;q=0.8"), "nr");
  assert.equal(localeFromAcceptLanguage("mi-NZ,en;q=0.6"), "mi");
});

test("localeFromAcceptLanguage empty / junk → null", () => {
  assert.equal(localeFromAcceptLanguage(""), null);
  assert.equal(localeFromAcceptLanguage(null), null);
  assert.equal(localeFromAcceptLanguage("xx-YY"), null);
});
