#!/usr/bin/env node
/**
 * After Chrome Web Store publish, write chromeWebStoreUrl (+ optional item id).
 *
 *   node scripts/set-chrome-webstore-url.mjs --url 'https://chromewebstore.google.com/detail/…/ITEM_ID'
 *   node scripts/set-chrome-webstore-url.mjs --url '…' --id ITEM_ID
 *   node scripts/set-chrome-webstore-url.mjs --clear
 *
 * Does not invent URLs — refuses empty / placeholder hosts.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const path = join(root, "shared/extension-stores.json");
const args = process.argv.slice(2);

function usage(code = 1) {
  console.error(
    "Usage: node scripts/set-chrome-webstore-url.mjs --url <chromewebstore…> [--id <itemId>]\n" +
      "       node scripts/set-chrome-webstore-url.mjs --clear"
  );
  process.exit(code);
}

if (args.includes("--clear")) {
  const j = JSON.parse(readFileSync(path, "utf8"));
  j.chromeWebStoreUrl = "";
  j.chromeWebStoreItemId = "";
  writeFileSync(path, `${JSON.stringify(j, null, 2)}\n`);
  console.info("[set-chrome-webstore-url] cleared chromeWebStoreUrl + chromeWebStoreItemId");
  process.exit(0);
}

const urlIdx = args.indexOf("--url");
const idIdx = args.indexOf("--id");
if (urlIdx < 0 || !args[urlIdx + 1]) usage(1);
const url = String(args[urlIdx + 1]).trim();
const idArg = idIdx >= 0 ? String(args[idIdx + 1] || "").trim() : "";

if (!/^https:\/\/chromewebstore\.google\.com\//i.test(url)) {
  console.error(
    "[set-chrome-webstore-url] refuse: URL must start with https://chromewebstore.google.com/"
  );
  process.exit(1);
}

let itemId = idArg;
if (!itemId) {
  const m = url.match(/\/([a-p]{32})(?:\/|$|\?)/i) || url.match(/\/detail\/[^/]+\/([a-p]{32})/i);
  itemId = m ? m[1] : "";
}

const j = JSON.parse(readFileSync(path, "utf8"));
j.chromeWebStoreUrl = url;
if (itemId) j.chromeWebStoreItemId = itemId;
writeFileSync(path, `${JSON.stringify(j, null, 2)}\n`);
console.info(`[set-chrome-webstore-url] chromeWebStoreUrl=${url}`);
if (itemId) console.info(`[set-chrome-webstore-url] chromeWebStoreItemId=${itemId}`);
