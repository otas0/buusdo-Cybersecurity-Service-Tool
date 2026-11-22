/**
 * Packed-path MIN_SUPPORTED.txt fixture → readMinSupportedLine (GET /api/min-supported).
 *
 *   npx tsx --test tests/desktop-min-supported-api.test.ts
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(".");
const { readMinSupportedLine } = require(
  path.join(repoRoot, "desktop-app/src/min-supported-line.js")
) as {
  readMinSupportedLine: (opts: {
    root: string;
    sharedRoot: string;
    env?: NodeJS.ProcessEnv;
    resourcesPath?: string | null;
  }) => { ok: boolean; line: string | null; minSupportedVersion: string | null; source: string | null };
};

const shared = path.join(repoRoot, "shared");

test("readMinSupportedLine prefers fixture MIN_SUPPORTED.txt first line", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-min-txt-"));
  try {
    const fixture = path.join(dir, "MIN_SUPPORTED.txt");
    const line =
      "buusdo Cybersecurity Service Tool — minimum supported version: 9.9.9-fixture";
    writeFileSync(fixture, `${line}\nsecond line ignored\n`, "utf8");

    const res = readMinSupportedLine({
      root: path.join(repoRoot, "desktop-app"),
      sharedRoot: shared,
      env: { SHIELD_MIN_SUPPORTED_TXT: fixture },
      resourcesPath: null
    });
    assert.equal(res.ok, true);
    assert.equal(res.line, line);
    assert.ok(
      String(res.source || "").includes("MIN_SUPPORTED.txt"),
      `expected fixture source, got ${res.source}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("readMinSupportedLine prefers resourcesPath MIN_SUPPORTED.txt (packed app)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-min-res-"));
  try {
    const fixture = path.join(dir, "MIN_SUPPORTED.txt");
    const line =
      "buusdo Cybersecurity Service Tool — minimum supported version: 8.8.8-resources";
    writeFileSync(fixture, `${line}\n`, "utf8");

    const res = readMinSupportedLine({
      root: path.join(repoRoot, "desktop-app"),
      sharedRoot: shared,
      env: {},
      resourcesPath: dir
    });
    assert.equal(res.ok, true);
    assert.equal(res.line, line);
    assert.equal(res.source, fixture);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("readMinSupportedLine reads root/Resources/MIN_SUPPORTED.txt when no env/resourcesPath", () => {
  const root = mkdtempSync(path.join(tmpdir(), "shield-min-root-"));
  try {
    const resDir = path.join(root, "Resources");
    mkdirSync(resDir, { recursive: true });
    const fixture = path.join(resDir, "MIN_SUPPORTED.txt");
    const line =
      "buusdo Cybersecurity Service Tool — minimum supported version: 7.7.7-root-resources";
    writeFileSync(fixture, `${line}\n`, "utf8");

    const res = readMinSupportedLine({
      root,
      sharedRoot: shared,
      env: {},
      resourcesPath: null
    });
    assert.equal(res.ok, true);
    assert.equal(res.line, line);
    assert.equal(res.source, fixture);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("readMinSupportedLine reads packaging/macos/MIN_SUPPORTED.txt (fourth candidate)", () => {
  const root = mkdtempSync(path.join(tmpdir(), "shield-min-macos-"));
  try {
    const macDir = path.join(root, "packaging", "macos");
    mkdirSync(macDir, { recursive: true });
    const fixture = path.join(macDir, "MIN_SUPPORTED.txt");
    const line =
      "buusdo Cybersecurity Service Tool — minimum supported version: 6.6.6-macos-pack";
    writeFileSync(fixture, `${line}\n`, "utf8");

    const res = readMinSupportedLine({
      root,
      sharedRoot: shared,
      env: {},
      resourcesPath: null
    });
    assert.equal(res.ok, true);
    assert.equal(res.line, line);
    assert.equal(res.source, fixture);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("readMinSupportedLine falls back to desktop-downloads.json when no txt", () => {
  const res = readMinSupportedLine({
    root: path.join(repoRoot, "desktop-app"),
    sharedRoot: shared,
    env: {},
    resourcesPath: null
  });
  assert.equal(res.ok, true);
  assert.ok(res.line);
  assert.match(String(res.line), /minimum supported version/i);
  assert.equal(res.source, "desktop-downloads.json");
});

test("readMinSupportedLine JSON fallback is fifth after all txt candidates miss", () => {
  const root = mkdtempSync(path.join(tmpdir(), "shield-min-json-fifth-"));
  try {
    // Empty tree: no env, no resourcesPath, no Resources/, no packaging/macos/.
    const res = readMinSupportedLine({
      root,
      sharedRoot: shared,
      env: {},
      resourcesPath: null
    });
    assert.equal(res.ok, true);
    assert.ok(res.line);
    assert.match(String(res.line), /minimum supported version/i);
    assert.equal(res.source, "desktop-downloads.json");
    assert.ok(res.minSupportedVersion);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("readMinSupportedLine path order: env → resources → Resources → packaging/macos", () => {
  const root = mkdtempSync(path.join(tmpdir(), "shield-min-order-"));
  const resDir = mkdtempSync(path.join(tmpdir(), "shield-min-order-res-"));
  try {
    const envFile = path.join(root, "env-MIN_SUPPORTED.txt");
    const resourcesFile = path.join(resDir, "MIN_SUPPORTED.txt");
    const rootResources = path.join(root, "Resources");
    const macosDir = path.join(root, "packaging", "macos");
    mkdirSync(rootResources, { recursive: true });
    mkdirSync(macosDir, { recursive: true });
    writeFileSync(envFile, "floor: env-first\n", "utf8");
    writeFileSync(resourcesFile, "floor: resourcesPath\n", "utf8");
    writeFileSync(path.join(rootResources, "MIN_SUPPORTED.txt"), "floor: root-Resources\n", "utf8");
    writeFileSync(path.join(macosDir, "MIN_SUPPORTED.txt"), "floor: packaging-macos\n", "utf8");

    const withEnv = readMinSupportedLine({
      root,
      sharedRoot: shared,
      env: { SHIELD_MIN_SUPPORTED_TXT: envFile },
      resourcesPath: resDir
    });
    assert.equal(withEnv.line, "floor: env-first");
    assert.equal(withEnv.source, envFile);

    const withResources = readMinSupportedLine({
      root,
      sharedRoot: shared,
      env: {},
      resourcesPath: resDir
    });
    assert.equal(withResources.line, "floor: resourcesPath");
    assert.equal(withResources.source, resourcesFile);

    const withRootResources = readMinSupportedLine({
      root,
      sharedRoot: shared,
      env: {},
      resourcesPath: null
    });
    assert.equal(withRootResources.line, "floor: root-Resources");
    assert.equal(withRootResources.source, path.join(rootResources, "MIN_SUPPORTED.txt"));

    rmSync(path.join(rootResources, "MIN_SUPPORTED.txt"), { force: true });
    const withMacos = readMinSupportedLine({
      root,
      sharedRoot: shared,
      env: {},
      resourcesPath: null
    });
    assert.equal(withMacos.line, "floor: packaging-macos");
    assert.equal(withMacos.source, path.join(macosDir, "MIN_SUPPORTED.txt"));
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(resDir, { recursive: true, force: true });
  }
});
