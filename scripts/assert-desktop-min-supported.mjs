/**
 * Gate: minSupportedVersion ≤ releaseTag, ≤ desktop-app package.json version,
 * and minSupportedBumpReason is a non-empty one-line reason.
 *
 * RELEASE_TAG may be ahead of shared/desktop-downloads.json releaseTag (pre-publish);
 * bump reason is still required in that case.
 *
 *   node scripts/assert-desktop-min-supported.mjs
 *   RELEASE_TAG=desktop-v0.3.0 node scripts/assert-desktop-min-supported.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(".");
const require = createRequire(import.meta.url);
const { parseSemver, compareSemver, isBelowMin, isNewer } = require(
  path.join(root, "desktop-app/src/semver.js")
);

const downloads = JSON.parse(
  readFileSync(path.join(root, "shared/desktop-downloads.json"), "utf8")
);
const pkg = JSON.parse(
  readFileSync(path.join(root, "desktop-app/package.json"), "utf8")
);

const minRaw = String(downloads.minSupportedVersion || "").trim();
const tagFromJson = String(downloads.releaseTag || "").trim();
const tagEnv = String(process.env.RELEASE_TAG || "").trim();
const releaseTag = tagEnv || tagFromJson;
const pkgVer = String(pkg.version || "").trim();
const bumpReason = String(downloads.minSupportedBumpReason || "").trim();

const min = parseSemver(minRaw);
const remote = parseSemver(releaseTag);
const installed = parseSemver(pkgVer);

if (!min) {
  console.error(`minSupportedVersion not a semver: ${JSON.stringify(minRaw)}`);
  process.exit(1);
}
if (!remote) {
  console.error(`releaseTag not a semver: ${JSON.stringify(releaseTag)}`);
  process.exit(1);
}
if (!installed) {
  console.error(`desktop-app/package.json version not a semver: ${JSON.stringify(pkgVer)}`);
  process.exit(1);
}

const cmpRelease = compareSemver(minRaw, releaseTag);
if (!Number.isFinite(cmpRelease) || cmpRelease > 0) {
  console.error(
    `minSupportedVersion (${minRaw}) must be ≤ releaseTag (${releaseTag})`
  );
  process.exit(1);
}

// Shipped package must not sit below the force floor (would brick fresh installs).
if (isBelowMin(pkgVer, minRaw)) {
  console.error(
    `desktop-app package.json version (${pkgVer}) is below minSupportedVersion (${minRaw})`
  );
  process.exit(1);
}

// Always required — including when RELEASE_TAG is ahead of json releaseTag.
if (!bumpReason) {
  console.error(
    "shared/desktop-downloads.json minSupportedBumpReason must be a non-empty one-line reason (rewrite whenever you raise minSupportedVersion)"
  );
  process.exit(1);
}
if (/\n/.test(String(downloads.minSupportedBumpReason || ""))) {
  console.error("minSupportedBumpReason must be a single line");
  process.exit(1);
}

const tagAheadOfJson =
  Boolean(tagEnv) &&
  Boolean(tagFromJson) &&
  Number.isFinite(compareSemver(tagEnv, tagFromJson)) &&
  isNewer(tagEnv, tagFromJson);

console.log(
  `desktop minSupported OK: min=${minRaw} ≤ release=${releaseTag.replace(/^desktop-v/i, "").replace(/^v/i, "")}; pkg=${pkgVer}; reason=${bumpReason.slice(0, 72)}${
    tagAheadOfJson ? ` (RELEASE_TAG ahead of json ${tagFromJson})` : ""
  }`
);
