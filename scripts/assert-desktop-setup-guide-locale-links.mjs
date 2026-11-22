/**
 * DESKTOP_SETUP_GUIDE.md locale table → /{locale}/downloads links,
 * and major language sections mention the three-step install path.
 *
 *   node scripts/assert-desktop-setup-guide-locale-links.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const guide = readFileSync(path.join(root, "docs/DESKTOP_SETUP_GUIDE.md"), "utf8");

const tableLocales = [
  ...guide.matchAll(/\| `([a-z]{2,3}(?:-[A-Za-z]+)?|zh-Hans|zh-Hant|pt-PT|pt-BR)` \|/g)
].map((m) => m[1]);

if (tableLocales.length < 20) {
  console.error(
    `DESKTOP_SETUP_GUIDE locale table too short (${tableLocales.length}) — expected Downloads locale rows`
  );
  process.exit(1);
}

let failed = 0;
for (const id of tableLocales) {
  const needle = `/${id}/downloads`;
  if (!guide.includes(needle)) {
    console.error(`DESKTOP_SETUP_GUIDE missing Downloads link for ${id}: ${needle}`);
    failed += 1;
  }
}

const threeStepSections = [
  ["Three steps (everyone)", /Three steps \(everyone\)/i],
  ["Português", /Três passos/i],
  ["简体中文", /三步/],
  ["日本語", /3 ステップ|3ステップ/],
  ["Deutsch", /Drei Schritte/i],
  ["Français", /Trois étapes/i]
];
for (const [label, re] of threeStepSections) {
  if (!re.test(guide)) {
    console.error(`DESKTOP_SETUP_GUIDE missing three-step lead for ${label}`);
    failed += 1;
  }
}

if (!guide.includes("desktopInstallStep") && !guide.includes("desktopInstallStep*")) {
  console.error(
    "DESKTOP_SETUP_GUIDE should mention desktopInstallStep* pack keys (spot-check note)"
  );
  failed += 1;
}

if (!guide.includes("assert-desktop-setup-guide-locale-links")) {
  // Self-reference optional — add footer note instead of failing hard.
}

if (failed) process.exit(1);
console.log(
  `DESKTOP_SETUP_GUIDE locale Downloads links OK (${tableLocales.length} locales) + three-step sections`
);
