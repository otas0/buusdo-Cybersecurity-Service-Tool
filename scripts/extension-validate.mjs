#!/usr/bin/env node
/**
 * Static checks for Chrome + Safari shared extension package.
 *
 *   npm run extension:validate
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const root = join(process.cwd(), "extension");
const require = createRequire(import.meta.url);

function fail(msg) {
  console.error(`[extension:validate] FAIL ${msg}`);
  process.exit(1);
}

const required = [
  "manifest.json",
  "background/service-worker.js",
  "popup/popup.html",
  "popup/popup.js",
  "popup/popup.css",
  "content/content.js",
  "content/toast.css",
  "rules/tracker_blocklist.json",
  "shared/api-base-migrate.mjs",
  "shared/browser-api.js",
  "icons/icon16.png",
  "icons/icon48.png",
  "icons/icon128.png"
];

for (const rel of required) {
  if (!existsSync(join(root, rel))) fail(`missing ${rel}`);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
} catch (err) {
  fail(`manifest.json invalid JSON: ${err}`);
}

if (manifest.manifest_version !== 3) fail("manifest_version must be 3");
if (!manifest.background?.service_worker) fail("background.service_worker required");
if (manifest.background?.type === "module") {
  fail("background.type=module breaks Safari — use classic service worker + importScripts");
}
if (!manifest.browser_specific_settings?.safari?.strict_min_version) {
  fail("browser_specific_settings.safari.strict_min_version required");
}

const hosts = manifest.host_permissions || [];
if (!hosts.some((h) => String(h).includes("buusdocst.mtsu.workers.dev"))) {
  fail("host_permissions must include https://buusdocst.mtsu.workers.dev/* (run npm run production:origin)");
}

const { DEFAULT_API_BASE, PRODUCTION_ORIGIN } = await import(
  join(root, "shared/api-base-migrate.mjs")
);
if (!String(DEFAULT_API_BASE).startsWith("https://buusdocst.mtsu.workers.dev")) {
  fail(`DEFAULT_API_BASE expected pcpd, got ${DEFAULT_API_BASE}`);
}
if (PRODUCTION_ORIGIN !== "https://buusdocst.mtsu.workers.dev") {
  fail(`PRODUCTION_ORIGIN expected pcpd, got ${PRODUCTION_ORIGIN}`);
}

// DNR rules parse
try {
  const rules = JSON.parse(readFileSync(join(root, "rules/tracker_blocklist.json"), "utf8"));
  if (!Array.isArray(rules) || rules.length < 1) fail("tracker_blocklist.json empty");
} catch (err) {
  fail(`tracker_blocklist.json: ${err}`);
}

// Site production-site.json agrees
const site = require("../shared/production-site.json");
if (site.productionOrigin !== "https://buusdocst.mtsu.workers.dev") {
  fail(`shared/production-site.json origin mismatch: ${site.productionOrigin}`);
}

console.info(
  `[extension:validate] OK mv3 safari≥${manifest.browser_specific_settings.safari.strict_min_version} api=${DEFAULT_API_BASE} rules=${JSON.parse(readFileSync(join(root, "rules/tracker_blocklist.json"), "utf8")).length}`
);