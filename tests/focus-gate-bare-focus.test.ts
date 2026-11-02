import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { extractStyleBlocks, findBareFocus } from "../scripts/lib/focus-gate.mjs";

test("focus gate fixture: bare :focus in <style> fails loudly", () => {
  const html = `<!doctype html><html><head>
<style>
  a:focus { outline: 2px solid red; }
  button:focus-visible { outline: 1px solid orange; }
</style>
</head><body></body></html>`;
  const css = extractStyleBlocks(html);
  const bare = findBareFocus(css, "fixture-index.html");
  assert.equal(bare.length, 1, `expected one bare :focus, got ${JSON.stringify(bare)}`);
  assert.match(bare[0], /a:focus/);
});

test("focus gate fixture: :focus-visible and :focus-within alone pass", () => {
  const css = `
    button:focus-visible { outline: 1px solid var(--halt); }
    label:focus-within { outline: 1px solid blue; }
  `;
  assert.deepEqual(findBareFocus(css, "ok"), []);
});

test("focus gate assert script exits 1 for bad index.html fixture", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-focus-gate-"));
  const badIndex = path.join(dir, "index.html");
  try {
    writeFileSync(
      badIndex,
      `<!doctype html><html><head><style>a:focus{outline:1px solid red}</style></head><body></body></html>\n`
    );
    const result = spawnSync(
      process.execPath,
      [path.resolve("scripts/assert-dashboard-no-bare-focus.mjs")],
      {
        cwd: process.cwd(),
        env: { ...process.env, SHIELD_FOCUS_GATE_INDEX_HTML: badIndex },
        encoding: "utf8"
      }
    );
    assert.equal(result.status, 1, `expected exit 1, got ${result.status}\n${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /bare :focus/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("focus gate assert script exits 1 for bad ops HTML fixture", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-focus-gate-ops-"));
  const badOps = path.join(dir, "home-continue-timeline.html");
  try {
    writeFileSync(
      badOps,
      `<!doctype html><html><head><style>button:focus{outline:2px solid red}</style></head><body></body></html>\n`
    );
    const result = spawnSync(
      process.execPath,
      [path.resolve("scripts/assert-dashboard-no-bare-focus.mjs")],
      {
        cwd: process.cwd(),
        env: { ...process.env, SHIELD_FOCUS_GATE_OPS_HTML: badOps },
        encoding: "utf8"
      }
    );
    assert.equal(result.status, 1, `expected exit 1, got ${result.status}\n${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /bare :focus/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("focus gate SHIELD_FOCUS_GATE_FIXTURE_DIR supplies index + ops", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shield-focus-gate-dir-"));
  try {
    writeFileSync(
      path.join(dir, "index.html"),
      `<!doctype html><html><head><style>a:focus{outline:1px solid red}</style></head><body></body></html>\n`
    );
    writeFileSync(
      path.join(dir, "home-continue-timeline.html"),
      `<!doctype html><html><head><style>button:focus-visible{outline:1px solid orange}</style></head><body></body></html>\n`
    );
    const result = spawnSync(
      process.execPath,
      [path.resolve("scripts/assert-dashboard-no-bare-focus.mjs")],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          SHIELD_FOCUS_GATE_FIXTURE_DIR: dir,
          SHIELD_FOCUS_GATE_INDEX_HTML: "",
          SHIELD_FOCUS_GATE_OPS_HTML: ""
        },
        encoding: "utf8"
      }
    );
    assert.equal(result.status, 1, `expected exit 1, got ${result.status}\n${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /bare :focus/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});