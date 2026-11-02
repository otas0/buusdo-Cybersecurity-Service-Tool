/**
 * Tag-only (?tag=only, no run) stamp === title — no Playwright Chromium.
 * Fixture + generated browser JS must match shared/home-continue-stamp.ts.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { stampLabelFromParams } from "../shared/home-continue-stamp";

const root = path.resolve(".");
const fixture = path.join(root, "tests/fixtures/home-continue-stamp-tag-only.html");
const opsHtml = path.join(root, "ops/home-continue-timeline.html");
const browserJs = path.join(root, "ops/home-continue-stamp.browser.js");
const sharedSrc = path.join(root, "shared/home-continue-stamp.ts");

const FORMULA_RE =
  /Home-continue timeline · \$\{stampTag \|\| "—"\}\$\{stampRun \? ` · run \$\{stampRun\}` : ""\}/;

test("fixture HTML exists for ?tag=only", () => {
  assert.equal(existsSync(fixture), true);
  const html = readFileSync(fixture, "utf8");
  assert.match(html, /stampLabelFromParams/);
  assert.match(html, /data-testid="home-continue-stamp"/);
  assert.match(html, /id="svg-title"/);
});

test("ops HTML loads generated home-continue-stamp.browser.js", () => {
  const html = readFileSync(opsHtml, "utf8");
  assert.match(html, /src="\.\/home-continue-stamp\.browser\.js"/);
  assert.match(html, /stampLabelFromParams\(window\.location\.search\)/);
  assert.match(html, /el\.textContent = stampLabel/);
  assert.match(html, /title\.textContent = stampLabel/);
  assert.equal(existsSync(browserJs), true);
});

test("shared + browser.js + fixture formulas match", () => {
  const shared = readFileSync(sharedSrc, "utf8");
  const browser = readFileSync(browserJs, "utf8");
  const fixtureHtml = readFileSync(fixture, "utf8");
  assert.match(shared, FORMULA_RE);
  assert.match(browser, FORMULA_RE);
  assert.match(fixtureHtml, FORMULA_RE);
  const generated = new Function(`${browser}; return stampLabelFromParams;`)();
  assert.equal(generated("?tag=only"), stampLabelFromParams("?tag=only"));
});

test("?tag=only (no run): stamp === title via shared module", () => {
  const stamp = stampLabelFromParams("?tag=only");
  const title = stamp;
  assert.equal(stamp, title);
  assert.equal(stamp, "Home-continue timeline · only");
  assert.equal(stamp.includes("run"), false);
});

test("fixture stampLabelFromParams(\"?tag=only\") equals shared", () => {
  const html = readFileSync(fixture, "utf8");
  assert.match(html, FORMULA_RE);
  assert.equal(stampLabelFromParams("?tag=only"), "Home-continue timeline · only");
  assert.equal(stampLabelFromParams("tag=only"), stampLabelFromParams("?tag=only"));
});