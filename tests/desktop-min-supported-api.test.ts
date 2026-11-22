/**
 * Packed-path MIN_SUPPORTED.txt fixture → readMinSupportedLine (GET /api/min-supported).
 *
 *   npx tsx --test tests/desktop-min-supported-api.test.ts
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
