/**
 * Refuse empty desktop packs: production deps (express) must ship inside the staged app.
 *
 * Usage:
 *   node scripts/assert-desktop-pack-express.mjs [appRoot…]
 *   SHIELD_PACK_EXPRESS_ZIP=path/to/macos-app.zip node scripts/assert-desktop-pack-express.mjs
 *   SHIELD_PACK_EXPRESS_MIN_ZIP_BYTES=55000000 …  (mac zip size floor; ~58MB ship)
 *
 * Default roots when argv empty: macos .app, windows NSIS stage, linux amd64/arm64 staged trees.
 */
import { existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";

const repo = path.resolve(".");
const desktop = path.join(repo, "desktop-app");

/** Bytes — below this the unsigned mac zip is the pre-deps (~50MB) empty-runtime ship. */
export const MAC_ZIP_SIZE_FLOOR_BYTES = Number(
  process.env.SHIELD_PACK_EXPRESS_MIN_ZIP_BYTES || 55_000_000
);

const defaultRoots = [
  path.join(desktop, "dist/macos/Preventive Shield.app/Contents/Resources/app"),
  path.join(desktop, "packaging/windows/stage/app"),
  path.join(desktop, "dist/linux/preventive-shield_0.2.0_amd64/usr/lib/preventive-shield"),
  path.join(desktop, "dist/linux/preventive-shield_0.2.0_arm64/usr/lib/preventive-shield")
];

function fail(msg) {
  console.error(`assert-desktop-pack-express: ${msg}`);
  process.exit(1);
}

function assertExpressInAppRoot(appRoot, { required }) {
  const expressPkg = path.join(appRoot, "node_modules/express/package.json");
  if (!existsSync(expressPkg)) {
    if (required) fail(`missing node_modules/express under ${appRoot}`);
    console.log(`skip (no express yet): ${appRoot}`);
    return false;
  }
  console.log(`ok express: ${appRoot}`);
  return true;
}

function assertMacZip(zipPath) {
  if (!existsSync(zipPath)) fail(`zip missing: ${zipPath}`);
  const size = statSync(zipPath).size;
  if (size < MAC_ZIP_SIZE_FLOOR_BYTES) {
    fail(
      `mac zip ${zipPath} is ${size} bytes (< ${MAC_ZIP_SIZE_FLOOR_BYTES}) — likely missing node_modules (expect ~58MB)`
    );
  }
  const tmp = mkdtempSync(path.join(tmpdir(), "shield-pack-express-"));
  try {
    const unzip = spawnSync("unzip", ["-qo", zipPath, "-d", tmp], { encoding: "utf8" });
    if (unzip.status !== 0) {
      fail(`unzip failed: ${unzip.stderr || unzip.stdout || unzip.status}`);
    }
    const appRoot = path.join(tmp, "Preventive Shield.app/Contents/Resources/app");
    if (!existsSync(appRoot)) {
      fail(`zip layout missing Preventive Shield.app Resources/app (${zipPath})`);
    }
    assertExpressInAppRoot(appRoot, { required: true });
    console.log(`ok mac zip size ${size} (>= ${MAC_ZIP_SIZE_FLOOR_BYTES}): ${zipPath}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const zipEnv = (process.env.SHIELD_PACK_EXPRESS_ZIP || "").trim();
if (zipEnv) {
  assertMacZip(path.resolve(zipEnv));
}

const argvRoots = process.argv.slice(2).map((p) => path.resolve(p));
const roots = argvRoots.length ? argvRoots : defaultRoots;
const required = argvRoots.length > 0;
let checked = zipEnv ? 1 : 0;
for (const root of roots) {
  if (!existsSync(root)) {
    if (required) fail(`app root missing: ${root}`);
    console.log(`skip (absent): ${root}`);
    continue;
  }
  if (assertExpressInAppRoot(root, { required })) checked += 1;
}

if (checked < 1) {
  if (process.env.SHIELD_PACK_EXPRESS_OPTIONAL === "1") {
    console.log("ok optional: no pack trees present — skip express assert");
    process.exit(0);
  }
  fail("no pack trees or zip checked — pack first or pass appRoot / SHIELD_PACK_EXPRESS_ZIP");
}
