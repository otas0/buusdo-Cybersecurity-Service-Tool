import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("production-site.json has HTTPS productionOrigin after first deploy", () => {
  const site = JSON.parse(
    readFileSync(join(process.cwd(), "shared", "production-site.json"), "utf8")
  ) as { productionOrigin?: string };
  assert.match(String(site.productionOrigin || ""), /^https:\/\//);
});

test("desktop server defaults WEBSITE_CHECK_URL from production-site.json when env unset", () => {
  const src = readFileSync(join(process.cwd(), "desktop-app", "src", "server.js"), "utf8");
  assert.match(src, /production-site\.json/);
  assert.match(src, /function resolveWebsiteCheckUrl/);
  assert.match(src, /WEBSITE_CHECK_URL_SOURCE/);
  assert.match(src, /Website origin/);

  const site = JSON.parse(
    readFileSync(join(process.cwd(), "shared", "production-site.json"), "utf8")
  ) as { productionOrigin?: string };
  const origin = String(site.productionOrigin || "")
    .trim()
    .replace(/\/$/, "");
  assert.ok(origin, "productionOrigin must be set for desktop default");
  assert.match(origin, /^https:\/\/.+/);
});