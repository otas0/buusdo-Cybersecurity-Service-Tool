/**
 * Keep desktop-notarize-macos.yml workflow_dispatch release_tag default
 * aligned with shared/desktop-downloads.json releaseTag (UI needs less typing).
 *
 *   node scripts/assert-notarize-release-tag-default.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const downloadsPath =
  process.env.SHIELD_DOWNLOADS_JSON || path.join(root, "shared/desktop-downloads.json");
const ymlPath =
  process.env.SHIELD_NOTARIZE_YML ||
  path.join(root, ".github/workflows/desktop-notarize-macos.yml");
const downloads = JSON.parse(readFileSync(downloadsPath, "utf8"));
const yml = readFileSync(ymlPath, "utf8");
const jsonTag = String(downloads.releaseTag || "").trim();
if (!jsonTag) {
  console.error("shared/desktop-downloads.json missing releaseTag");
  process.exit(1);
}

const block = yml.match(/release_tag:\s*\n([\s\S]*?)(?=\n\S|\npermissions:)/);
if (!block) {
  console.error("desktop-notarize-macos.yml: could not find release_tag input block");
  process.exit(1);
}
const def = block[1].match(/default:\s*"([^"]+)"/);
if (!def) {
  console.error("desktop-notarize-macos.yml: release_tag default string missing");
  process.exit(1);
}
if (def[1] !== jsonTag) {
  console.error(
    `notarize release_tag drift — YAML default: "${def[1]}" | JSON releaseTag: "${jsonTag}" (update .github/workflows/desktop-notarize-macos.yml default to match shared/desktop-downloads.json)`
  );
  process.exit(1);
}
console.log(`notarize release_tag default ok (${jsonTag})`);