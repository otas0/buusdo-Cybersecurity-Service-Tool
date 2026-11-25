/**
 * Workers → China Pages force-redirect helpers.
 *
 *   npx tsx --test tests/china-workers-redirect.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  CHINA_PAGES_ORIGIN,
  chinaPagesDestForWorkersPath,
  isChinaForceCountry,
  shouldSkipChinaWorkersRedirect
} from "../shared/china-workers-redirect";

test("CN country forces redirect; others do not", () => {
  assert.equal(isChinaForceCountry("CN"), true);
  assert.equal(isChinaForceCountry("cn"), true);
  assert.equal(isChinaForceCountry("US"), false);
  assert.equal(isChinaForceCountry(""), false);
  assert.equal(isChinaForceCountry(null), false);
});

test("pathname maps to zh index or en.html", () => {
  assert.equal(chinaPagesDestForWorkersPath("/"), `${CHINA_PAGES_ORIGIN}/`);
  assert.equal(chinaPagesDestForWorkersPath("/zh-Hans"), `${CHINA_PAGES_ORIGIN}/`);
  assert.equal(chinaPagesDestForWorkersPath("/zh-Hans/privacy"), `${CHINA_PAGES_ORIGIN}/`);
  assert.equal(chinaPagesDestForWorkersPath("/en"), `${CHINA_PAGES_ORIGIN}/en.html`);
  assert.equal(chinaPagesDestForWorkersPath("/en/privacy"), `${CHINA_PAGES_ORIGIN}/en.html`);
});

test("API and static paths skip redirect", () => {
  assert.equal(shouldSkipChinaWorkersRedirect("/api/health"), true);
  assert.equal(shouldSkipChinaWorkersRedirect("/api/check"), true);
  assert.equal(shouldSkipChinaWorkersRedirect("/_next/static/x.js"), true);
  assert.equal(shouldSkipChinaWorkersRedirect("/favicon.ico"), true);
  assert.equal(shouldSkipChinaWorkersRedirect("/brand/buusdo-logo.png"), true);
  assert.equal(shouldSkipChinaWorkersRedirect("/zh-Hans"), false);
  assert.equal(shouldSkipChinaWorkersRedirect("/"), false);
});

test("middleware.ts wires CF country + stay param", () => {
  const src = readFileSync("middleware.ts", "utf8");
  assert.match(src, /countryFromWorkersRequest/);
  assert.match(src, /china_workers_stay/);
  assert.match(src, /chinaPagesDestForWorkersPath/);
  assert.match(src, /NextResponse\.redirect/);
});

test("App Router enforces CN redirect (vinext may omit middleware)", () => {
  const page = readFileSync("app/[locale]/[[...slug]]/page.tsx", "utf8");
  const root = readFileSync("app/page.tsx", "utf8");
  const boot = readFileSync("components/ChinaMainlandForceRedirect.tsx", "utf8");
  assert.match(page, /enforceChinaMainlandForceRedirect/);
  assert.match(root, /enforceChinaMainlandForceRedirect/);
  assert.match(boot, /cf-ipcountry/i);
  assert.match(boot, /ChinaWorkersStayBoot/);
  assert.match(readFileSync("app/layout.tsx", "utf8"), /ChinaWorkersStayBoot/);
});
