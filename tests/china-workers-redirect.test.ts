/**
 * China Pages helpers — force-redirect by CF country is disabled (2026-11-28).
 *
 *   npx tsx --test tests/china-workers-redirect.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  CHINA_FORCE_REDIRECT_COUNTRIES,
  CHINA_PAGES_ORIGIN,
  chinaPagesDestForWorkersPath,
  isChinaForceCountry,
  shouldSkipChinaWorkersRedirect
} from "../shared/china-workers-redirect";

test("no country forces Worker redirect (empty set)", () => {
  assert.equal(CHINA_FORCE_REDIRECT_COUNTRIES.size, 0);
  assert.equal(isChinaForceCountry("CN"), false);
  assert.equal(isChinaForceCountry("cn"), false);
  assert.equal(isChinaForceCountry("US"), false);
  assert.equal(isChinaForceCountry(""), false);
  assert.equal(isChinaForceCountry(null), false);
});

test("pathname still maps to zh index or en.html (Pages helpers)", () => {
  assert.equal(chinaPagesDestForWorkersPath("/"), `${CHINA_PAGES_ORIGIN}/`);
  assert.equal(chinaPagesDestForWorkersPath("/zh-Hans"), `${CHINA_PAGES_ORIGIN}/`);
  assert.equal(chinaPagesDestForWorkersPath("/zh-Hans/privacy"), `${CHINA_PAGES_ORIGIN}/`);
  assert.equal(chinaPagesDestForWorkersPath("/en"), `${CHINA_PAGES_ORIGIN}/en.html`);
  assert.equal(chinaPagesDestForWorkersPath("/en/privacy"), `${CHINA_PAGES_ORIGIN}/en.html`);
});

test("API and static paths skip helpers", () => {
  assert.equal(shouldSkipChinaWorkersRedirect("/api/health"), true);
  assert.equal(shouldSkipChinaWorkersRedirect("/api/check"), true);
  assert.equal(shouldSkipChinaWorkersRedirect("/_next/static/x.js"), true);
  assert.equal(shouldSkipChinaWorkersRedirect("/favicon.ico"), true);
  assert.equal(shouldSkipChinaWorkersRedirect("/brand/buusdo-logo.png"), true);
  assert.equal(shouldSkipChinaWorkersRedirect("/zh-Hans"), false);
  assert.equal(shouldSkipChinaWorkersRedirect("/"), false);
});

test("middleware.ts has no country 302", () => {
  const src = readFileSync("middleware.ts", "utf8");
  assert.match(src, /china_workers_stay/);
  assert.doesNotMatch(src, /NextResponse\.redirect/);
  assert.doesNotMatch(src, /isChinaForceCountry/);
});

test("App Router enforce is no-op; SoftTip does not replace", () => {
  const page = readFileSync("app/[locale]/[[...slug]]/page.tsx", "utf8");
  const root = readFileSync("app/page.tsx", "utf8");
  const boot = readFileSync("components/ChinaMainlandForceRedirect.tsx", "utf8");
  const soft = readFileSync("components/ChinaMainlandSoftTip.tsx", "utf8");
  assert.match(page, /enforceChinaMainlandForceRedirect/);
  assert.match(root, /enforceChinaMainlandForceRedirect/);
  assert.match(boot, /no-op|Product decision/i);
  assert.doesNotMatch(boot, /redirect\(/);
  assert.doesNotMatch(soft, /location\.replace\s*\(/);
  assert.match(soft, /return null/);
  const layout = readFileSync("app/layout.tsx", "utf8");
  assert.match(layout, /ChinaWorkersStayBoot/);
  assert.doesNotMatch(layout, /ChinaMainlandSoftTip/);
});
