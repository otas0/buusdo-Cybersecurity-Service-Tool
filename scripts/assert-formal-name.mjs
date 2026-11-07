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

const shortDesc = listing.match(/## Short description \(EN\)\s*\n\n([\s\S]*?)\n\n##/);
if (shortDesc && /\bsync\b/i.test(shortDesc[1])) {
  console.error("[assert-formal-name] Chrome short description must not mention sync");
  process.exit(1);
}

/** Optional: GitHub About must not say "(separate product)" when gh is available. */
async function checkGithubDescription() {
  if (process.env.ASSERT_SKIP_GITHUB_DESCRIPTION === "1") {
    console.info("[assert-formal-name] skip GitHub description (ASSERT_SKIP_GITHUB_DESCRIPTION=1)");
    return;
  }
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);
  try {
    const { stdout } = await execFileAsync(
      "gh",
      ["repo", "view", "--json", "description", "-q", ".description"],
      { cwd: root, timeout: 15_000 },
    );
    const desc = String(stdout || "").trim();
    if (!desc) {
      console.info("[assert-formal-name] GitHub description empty — skip");
      return;
    }
    if (/separate\s+product/i.test(desc)) {
      console.error(
        '[assert-formal-name] GitHub repo description still contains "separate product" — remove it',
      );
      process.exit(1);
    }
    if (!desc.includes(formal) && !desc.toLowerCase().includes("buusdo cybersecurity service tool")) {
      console.error(
        `[assert-formal-name] GitHub description should mention formalName; got: ${desc.slice(0, 120)}`,
      );
      process.exit(1);
    }
    console.info("[assert-formal-name] GitHub description OK");
  } catch (err) {
    console.info(
      "[assert-formal-name] gh unavailable — skip GitHub description check",
      err instanceof Error ? err.message.split("\n")[0] : err,
    );
  }
}

await checkGithubDescription();
console.info(`[assert-formal-name] OK formalName=${JSON.stringify(formal)}`);
