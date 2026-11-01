/**
 * Settings history empty-copy hard-asserts (no Playwright / STRICT title).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { messages } from "../i18n/messages";

test("EN probe-blocked empty copy is fixed and wired in SettingsPanel", () => {
  assert.equal(
    messages.en.historyFilterProbeBlockedEmpty,
    "No probe-blocked checks in recent history."
  );
  assert.equal(
    messages.en.historyFilterEmpty,
    "No timed-out checks in recent history.",
    "timeouts-only empty path keeps historyFilterEmpty"
  );
  const panel = readFileSync(join(process.cwd(), "components/SettingsPanel.tsx"), "utf8");
  assert.match(panel, /historyFilterProbeBlockedEmpty/);
  assert.match(panel, /historyProbeBlockedOnly/);
  assert.match(
    panel,
    /historyProbeBlockedOnly\s*\?\s*t\.historyFilterProbeBlockedEmpty/
  );
});

test("EN probe-filter label string stays tied to historyFilterProbeBlocked", () => {
  assert.equal(messages.en.historyFilterProbeBlocked, "Show probe-blocked checks only");
  const panel = readFileSync(join(process.cwd(), "components/SettingsPanel.tsx"), "utf8");
  assert.match(panel, /\{t\.historyFilterProbeBlocked\}/);
  assert.match(panel, /history-filter-probe-blocked/);
});

test("history-export-csv-help is immediately above the export action-row", () => {
  const panel = readFileSync(join(process.cwd(), "components/SettingsPanel.tsx"), "utf8");
  assert.match(
    panel,
    /data-testid="history-export-csv-help"[\s\S]*?<\/p>\s*<div className="action-row">/
  );
  assert.match(panel, /\{t\.historyExportCsvHelp\}/);
});