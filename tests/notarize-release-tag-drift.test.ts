/**
 * Drifted YAML default must print both YAML default: and JSON releaseTag: substrings.
 */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const script = path.resolve("scripts/assert-notarize-release-tag-default.mjs");

test("notarize assert prints both tags when YAML default drifts", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-notarize-drift-"));
  try {
    const jsonPath = path.join(dir, "desktop-downloads.json");
    const ymlPath = path.join(dir, "desktop-notarize-macos.yml");
    writeFileSync(
      jsonPath,
      JSON.stringify({ releaseTag: "desktop-v9.9.9" }, null, 2) + "\n"
    );
    writeFileSync(
      ymlPath,
      `name: desktop-notarize-macos
on:
  workflow_dispatch:
    inputs:
      release_tag:
        description: "tag"
        type: string
        default: "desktop-v0.0.0"

permissions:
  contents: write
`
    );
    const result = spawnSync(process.execPath, [script], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        SHIELD_NOTARIZE_YML: ymlPath,
        SHIELD_DOWNLOADS_JSON: jsonPath
      }
    });
    assert.equal(result.status, 1, `expected exit 1\n${result.stdout}\n${result.stderr}`);
    const out = `${result.stdout}\n${result.stderr}`;
    assert.match(out, /YAML default:\s*"desktop-v0\.0\.0"/);
    assert.match(out, /JSON releaseTag:\s*"desktop-v9\.9\.9"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("notarize assert success path prints matching tag ok line", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-notarize-ok-"));
  try {
    const jsonPath = path.join(dir, "desktop-downloads.json");
    const ymlPath = path.join(dir, "desktop-notarize-macos.yml");
    writeFileSync(
      jsonPath,
      JSON.stringify({ releaseTag: "desktop-v1.2.3" }, null, 2) + "\n"
    );
    writeFileSync(
      ymlPath,
      `name: desktop-notarize-macos
on:
  workflow_dispatch:
    inputs:
      release_tag:
        description: "tag"
        type: string
        default: "desktop-v1.2.3"

permissions:
  contents: write
`
    );
    const result = spawnSync(process.execPath, [script], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        SHIELD_NOTARIZE_YML: ymlPath,
        SHIELD_DOWNLOADS_JSON: jsonPath
      }
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /notarize release_tag default ok \(desktop-v1\.2\.3\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});