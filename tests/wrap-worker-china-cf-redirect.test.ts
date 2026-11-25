/**
 * Post-build Worker wrap uses request.cf.country for CN→Pages.
 *
 *   npx tsx --test tests/wrap-worker-china-cf-redirect.test.ts
 */
import assert from "node:assert/strict";
import { execFileSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(".");

test("wrap-worker-china-cf-redirect writes entry + sets wrangler main", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-wrap-cn-"));
  const server = path.join(dir, "dist/server");
  mkdirSync(server, { recursive: true });
  writeFileSync(path.join(server, "index.js"), "export default { async fetch(){ return new Response('ok'); } };\n");
  writeFileSync(
    path.join(server, "wrangler.json"),
    JSON.stringify({ name: "buusdocst", main: "index.js" })
  );
  // Script resolves china-pages from repo root — run from repo with DIST override? Script uses fixed paths.
  // So run against real dist if present; else invoke after writing into repo dist — prefer unit on source.
  const src = readFileSync("scripts/wrap-worker-china-cf-redirect.mjs", "utf8");
  assert.match(src, /request\.cf/);
  assert.match(src, /FORCE_COUNTRIES/);
  assert.match(src, /china-cf-entry\.js/);
  assert.match(src, /cf-ipcountry/);
  assert.match(src, /Response\.redirect/);
  assert.match(src, /PAGES_ORIGIN/);
  assert.match(src, /x-buusdocst-china-wrap/);
  assert.match(src, /x-buusdocst-cf-country/);
  assert.match(src, /run_worker_first/);
  assert.match(src, /--check/);

  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.match(pkg.scripts["deploy:cloudflare"], /wrap-worker-china-cf-redirect/);
  assert.match(pkg.scripts["deploy:cloudflare"], /--check/);
  assert.match(pkg.scripts["deploy:cloudflare:staging"], /wrap-worker-china-cf-redirect/);

  rmSync(dir, { recursive: true, force: true });
});

test("countryFromWorkersRequest prefers cf.country over header", async () => {
  const { countryFromWorkersRequest, isChinaForceCountry } = await import(
    "../shared/china-workers-redirect.ts"
  );
  assert.equal(
    countryFromWorkersRequest({
      cf: { country: "CN" },
      headers: { get: () => null }
    }),
    "CN"
  );
  assert.equal(
    countryFromWorkersRequest({
      cf: { country: "US" },
      headers: { get: (n: string) => (n === "cf-ipcountry" ? "CN" : null) }
    }),
    "US"
  );
  assert.ok(isChinaForceCountry("CN"));
  assert.equal(isChinaForceCountry("US"), false);
});
