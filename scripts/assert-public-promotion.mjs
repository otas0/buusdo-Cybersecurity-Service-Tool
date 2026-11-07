/**
 * Assert docs/PUBLIC_PROMOTION.md paste-ready fenced blocks never advertise
 * legacy or local hosts, and include China Pages entry.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const path = join(root, "docs/PUBLIC_PROMOTION.md");
const text = readFileSync(path, "utf8");
const blocks = [...text.matchAll(/```([\s\S]*?)```/g)].map((m) => m[1]);

if (blocks.length < 2) {
  console.error("[assert-public-promotion] expected ≥2 fenced paste blocks");
  process.exit(1);
}

const banned = [
  /pcpd\./i,
  /preventive-shield\./i,
  /localhost/i,
  /127\.0\.0\.1/,
  /\bwww\./i,
];

let failed = false;
for (let i = 0; i < blocks.length; i += 1) {
  const block = blocks[i];
  for (const re of banned) {
    if (re.test(block)) {
      console.error(
        `[assert-public-promotion] paste block #${i + 1} matches ${re}`,
      );
      failed = true;
    }
  }
  if (!/buusdocst\.mtsu\.workers\.dev/.test(block)) {
    console.error(
      `[assert-public-promotion] paste block #${i + 1} missing buusdocst.mtsu.workers.dev`,
    );
    failed = true;
  }
  if (!/otas0\.github\.io\/buusdocst/.test(block)) {
    console.error(
      `[assert-public-promotion] paste block #${i + 1} missing China Pages otas0.github.io/buusdocst`,
    );
    failed = true;
  }
}

if (failed) process.exit(1);
console.info(
  `[assert-public-promotion] OK ${blocks.length} paste blocks (canonical + China Pages)`,
);
