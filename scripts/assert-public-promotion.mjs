/**
 * Assert docs/PUBLIC_PROMOTION.md paste-ready fenced blocks:
 * - No legacy / local hosts
 * - Mainland-only block (heading contains 面向大陆): China Pages only (no Workers URL)
 *   Whitelist: warning words like「勿等待 workers.dev 跳转」/ bare `workers.dev` are OK;
 *   ban `buusdocst.mtsu.workers.dev` and any `https://…workers.dev` product URL.
 * - Global / CF-reachable blocks: Workers + China Pages + A4 poster
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const path = join(root, "docs/PUBLIC_PROMOTION.md");
const text = readFileSync(path, "utf8");

const parts = text.split(/^## /m).filter((p) => p.startsWith("Ready-to-paste"));
const sections = [];
for (const part of parts) {
  const heading = `## ${part.split("\n")[0]}`;
  const fences = [...part.matchAll(/```([\s\S]*?)```/g)].map((x) => x[1]);
  for (const block of fences) {
    sections.push({ heading, block });
  }
}

if (sections.length < 2) {
  console.error("[assert-public-promotion] expected ≥2 Ready-to-paste fenced blocks");
  process.exit(1);
}

const banned = [
  /pcpd\./i,
  /preventive-shield\./i,
  /localhost/i,
  /127\.0\.0\.1/,
  /\bwww\./i
];

let failed = false;
let mainlandCount = 0;

for (let i = 0; i < sections.length; i += 1) {
  const { heading, block } = sections[i];
  const mainland = /面向大陆/.test(heading);

  for (const re of banned) {
    if (re.test(block)) {
      console.error(
        `[assert-public-promotion] paste block #${i + 1} (${heading.trim()}) matches ${re}`
      );
      failed = true;
    }
  }

  if (!/otas0\.github\.io\/buusdocst/.test(block)) {
    console.error(
      `[assert-public-promotion] paste block #${i + 1} missing China Pages otas0.github.io/buusdocst`
    );
    failed = true;
  }

  if (mainland) {
    mainlandCount += 1;
    // Allow the warning word "workers.dev"; ban product/poster URLs.
    if (/buusdocst\.mtsu\.workers\.dev|https?:\/\/\S*workers\.dev/i.test(block)) {
      console.error(
        `[assert-public-promotion] mainland paste block #${i + 1} must NOT contain a Workers URL`
      );
      failed = true;
    }
    if (/\/promo\/poster\.html/.test(block)) {
      console.error(
        `[assert-public-promotion] mainland paste block #${i + 1} should not mix A4 Workers poster URL`
      );
      failed = true;
    }
  } else {
    if (!/buusdocst\.mtsu\.workers\.dev/.test(block)) {
      console.error(
        `[assert-public-promotion] global paste block #${i + 1} missing buusdocst.mtsu.workers.dev`
      );
      failed = true;
    }
    if (!/\/promo\/poster\.html/.test(block)) {
      console.error(
        `[assert-public-promotion] global paste block #${i + 1} missing /promo/poster.html A4 entry`
      );
      failed = true;
    }
  }
}

if (mainlandCount < 1) {
  console.error(
    "[assert-public-promotion] expected ≥1 mainland-only paste block (heading 面向大陆)"
  );
  failed = true;
}

if (failed) process.exit(1);
console.info(
  `[assert-public-promotion] OK ${sections.length} paste blocks (${mainlandCount} mainland-only, no Workers URL)`
);
