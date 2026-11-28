/**
 * Post-build Worker wrap: debug headers + run_worker_first; no CN 302.
 *
 *   npx tsx --test tests/wrap-worker-china-cf-redirect.test.ts
 */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

test("wrap-worker-china-cf-redirect keeps wrap headers; FORCE_COUNTRIES empty", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-wrap-cn-"));
  const server = path.join(dir, "dist/server");
  mkdirSync(server, { recursive: true });
  writeFileSync(path.join(server, "index.js"), "export default { async fetch(){ return new Response('ok'); } };\n");
  writeFileSync(
    path.join(server, "wrangler.json"),
    JSON.stringify({ name: "buusdocst", main: "index.js" })
  );
  const src = readFileSync("scripts/wrap-worker-china-cf-redirect.mjs", "utf8");
  assert.match(src, /request\.cf/);
  assert.match(src, /FORCE_COUNTRIES/);
  assert.match(src, /JSON\.stringify\(\[\]\)/);
  assert.match(src, /china-cf-entry\.js/);
  assert.match(src, /cf-ipcountry/);
  assert.match(src, /PAGES_ORIGIN/);
  assert.match(src, /x-buusdocst-china-wrap/);
  assert.match(src, /x-buusdocst-cf-country/);
  assert.match(src, /run_worker_first/);
  assert.match(src, /run-worker-first\.mjs/);
  assert.match(src, /binding/);
  assert.match(src, /ASSETS/);
  assert.match(src, /--check/);
  assert.doesNotMatch(src, /run_worker_first:\s*true/);
  assert.match(src, /FORCE_COUNTRIES is empty|never 302/i);

  const rwf = readFileSync("scripts/run-worker-first.mjs", "utf8");
  assert.match(rwf, /!\/_next\/static\/\*/);
  assert.match(rwf, /!\/\*\/_next\/static\/\*/);

  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.match(pkg.scripts["deploy:cloudflare"], /wrap-worker-china-cf-redirect/);
  assert.match(pkg.scripts["deploy:cloudflare"], /--check/);
  assert.match(pkg.scripts["deploy:cloudflare:staging"], /wrap-worker-china-cf-redirect/);

  rmSync(dir, { recursive: true, force: true });
});

test("run_worker_first pattern excludes /_next/static (boolean true 404s CSS)", async () => {
  const { RUN_WORKER_FIRST, isValidRunWorkerFirst } = await import(
    "../scripts/run-worker-first.mjs"
  );
  assert.equal(isValidRunWorkerFirst(true), false);
  assert.equal(isValidRunWorkerFirst(["/*"]), false);
  assert.ok(isValidRunWorkerFirst(RUN_WORKER_FIRST));
});

test("countryFromWorkersRequest prefers cf.country; force list empty", async () => {
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
  assert.equal(isChinaForceCountry("CN"), false);
  assert.equal(isChinaForceCountry("US"), false);
});
