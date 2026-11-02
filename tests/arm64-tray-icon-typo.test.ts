/**
 * Arm64 / pack assets typo scan — flag icon-tray.png and similar, allow listed tray-icon*.
 */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const script = path.resolve("scripts/assert-tray-icon-typos.mjs");

test("typo scan fails on icon-tray.png in temp assets dir", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-tray-typo-"));
  try {
    writeFileSync(path.join(dir, "tray-icon.png"), "");
    writeFileSync(path.join(dir, "tray-icon-template.png"), "");
    writeFileSync(path.join(dir, "tray-icon.ico"), "");
    writeFileSync(path.join(dir, "icon-tray.png"), "");
    const result = spawnSync(process.execPath, [script, dir], {
      cwd: process.cwd(),
      encoding: "utf8"
    });
    assert.equal(result.status, 1, `expected exit 1\n${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /icon-tray\.png/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("typo scan passes when only desktop-tray-icons.json names are present", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-tray-ok-"));
  try {
    writeFileSync(path.join(dir, "tray-icon.png"), "");
    writeFileSync(path.join(dir, "tray-icon-template.png"), "");
    writeFileSync(path.join(dir, "tray-icon.ico"), "");
    const result = spawnSync(process.execPath, [script, dir], {
      cwd: process.cwd(),
      encoding: "utf8"
    });
    assert.equal(result.status, 0, `expected exit 0\n${result.stdout}\n${result.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("typo scan fails on tray_icon.png / TrayIcon.png (case-safe distinct names)", () => {
  // Avoid Tray-Icon.png vs tray-icon.png — macOS default FS is case-insensitive.
  const dir = mkdtempSync(path.join(tmpdir(), "shield-tray-case-"));
  try {
    writeFileSync(path.join(dir, "tray-icon.png"), "");
    writeFileSync(path.join(dir, "tray-icon-template.png"), "");
    writeFileSync(path.join(dir, "tray-icon.ico"), "");
    writeFileSync(path.join(dir, "tray_icon.png"), "");
    writeFileSync(path.join(dir, "TrayIcon.png"), "");
    const result = spawnSync(process.execPath, [script, dir], {
      cwd: process.cwd(),
      encoding: "utf8"
    });
    assert.equal(result.status, 1, `expected exit 1\n${result.stdout}\n${result.stderr}`);
    const out = `${result.stdout}\n${result.stderr}`;
    assert.match(out, /tray_icon\.png/);
    assert.match(out, /TrayIcon\.png/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("typo scan ignores co-located desktop-tray-icons.json / tray.md / tray.txt", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-tray-json-"));
  try {
    writeFileSync(path.join(dir, "tray-icon.png"), "");
    writeFileSync(path.join(dir, "tray-icon-template.png"), "");
    writeFileSync(path.join(dir, "tray-icon.ico"), "");
    writeFileSync(path.join(dir, "desktop-tray-icons.json"), "[]\n");
    writeFileSync(path.join(dir, "tray-notes.md"), "# tray\n");
    writeFileSync(path.join(dir, "tray-guide.markdown"), "# tray\n");
    writeFileSync(path.join(dir, "about-tray.txt"), "tray\n");
    const result = spawnSync(process.execPath, [script, dir], {
      cwd: process.cwd(),
      encoding: "utf8"
    });
    assert.equal(result.status, 0, `expected exit 0\n${result.stdout}\n${result.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("typo scan fails on nested assets/*/icon-tray.png (one level deep)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-tray-nested-"));
  try {
    writeFileSync(path.join(dir, "tray-icon.png"), "");
    writeFileSync(path.join(dir, "tray-icon-template.png"), "");
    writeFileSync(path.join(dir, "tray-icon.ico"), "");
    const nested = path.join(dir, "extra");
    mkdirSync(nested);
    writeFileSync(path.join(nested, "icon-tray.png"), "");
    const result = spawnSync(process.execPath, [script, dir], {
      cwd: process.cwd(),
      encoding: "utf8"
    });
    assert.equal(result.status, 1, `expected exit 1\n${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /extra[/\\]icon-tray\.png/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("typo scan ignores nested docs/**/*.markdown that mention tray in body", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-tray-md-nested-"));
  try {
    writeFileSync(path.join(dir, "tray-icon.png"), "");
    writeFileSync(path.join(dir, "tray-icon-template.png"), "");
    writeFileSync(path.join(dir, "tray-icon.ico"), "");
    const docs = path.join(dir, "docs");
    mkdirSync(docs);
    writeFileSync(path.join(docs, "packaging-tray.markdown"), "# How the tray icon ships\n");
    writeFileSync(path.join(docs, "tray-notes.rst"), "tray\n====\n");
    writeFileSync(path.join(docs, "tray-guide.adoc"), "= tray\n");
    const result = spawnSync(process.execPath, [script, dir], {
      cwd: process.cwd(),
      encoding: "utf8"
    });
    assert.equal(result.status, 0, `expected exit 0\n${result.stdout}\n${result.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("typo scan fails on tray.adoc.png (basename does not end with .adoc/.rst)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-tray-adoc-png-"));
  try {
    writeFileSync(path.join(dir, "tray-icon.png"), "");
    writeFileSync(path.join(dir, "tray-icon-template.png"), "");
    writeFileSync(path.join(dir, "tray-icon.ico"), "");
    writeFileSync(path.join(dir, "tray.adoc.png"), "");
    const result = spawnSync(process.execPath, [script, dir], {
      cwd: process.cwd(),
      encoding: "utf8"
    });
    assert.equal(result.status, 1, `expected exit 1\n${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /tray\.adoc\.png/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});