#!/usr/bin/env node
/**
 * CI: README + shared/brand.json must carry the official formalName.
 * shortName alone is not enough for product identity.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const brand = JSON.parse(readFileSync(join(root, "shared/brand.json"), "utf8"));
const formal = String(brand.formalName || "").trim();
if (!formal || formal === brand.shortName) {
  console.error("[assert-formal-name] shared/brand.json formalName missing or equals shortName");
  process.exit(1);
}

const readme = readFileSync(join(root, "README.md"), "utf8");
if (!readme.includes(formal)) {
  console.error(`[assert-formal-name] README.md must contain formalName: ${formal}`);
  process.exit(1);
}

const promo = readFileSync(join(root, "docs/PUBLIC_PROMOTION.md"), "utf8");
if (!promo.includes(formal)) {
  console.error(`[assert-formal-name] docs/PUBLIC_PROMOTION.md must contain formalName: ${formal}`);
  process.exit(1);
}
if (!/Do not[\s\S]*just ["“]buusdo["”]/i.test(promo) && !/Do not[\s\S]*alone as the product name/i.test(promo)) {
  console.error(
    '[assert-formal-name] PUBLIC_PROMOTION.md must forbid using short "buusdo" alone as the product name'
  );
  process.exit(1);
}

const listing = readFileSync(join(root, "docs/CHROME_STORE_LISTING_DRAFT.md"), "utf8");
if (!listing.includes(formal)) {
  console.error(`[assert-formal-name] CHROME_STORE_LISTING_DRAFT.md must contain formalName`);
  process.exit(1);
}

const pbx = readFileSync(
  join(root, "safari/Preventive Shield/Preventive Shield.xcodeproj/project.pbxproj"),
  "utf8"
);
const displayHits = [...pbx.matchAll(/INFOPLIST_KEY_CFBundleDisplayName = "([^"]+)";/g)].map((m) => m[1]);
if (displayHits.length < 4 || displayHits.some((n) => n !== formal)) {
  console.error(
    `[assert-formal-name] Safari CFBundleDisplayName must be ${JSON.stringify(formal)} on all targets; got`,
    displayHits
  );
  process.exit(1);
}

const pack = readFileSync(join(root, "scripts/pack-chrome-webstore.mjs"), "utf8");
if (!pack.includes("buusdo-cybersecurity-service-tool-")) {
  console.error("[assert-formal-name] pack-chrome-webstore.mjs zip prefix must be buusdo-cybersecurity-service-tool-");
  process.exit(1);
}

console.info(`[assert-formal-name] OK formalName=${JSON.stringify(formal)}`);
