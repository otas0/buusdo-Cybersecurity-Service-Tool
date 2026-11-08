import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

test("halt-known-threat fixture host is on curated own-threat list", () => {
  const fixture = JSON.parse(
    readFileSync(path.join("security/data/fixtures/halt-known-threat.json"), "utf8")
  ) as { host: string; threatState: string; notes?: string[] | string; listFile?: string };
  const curated = JSON.parse(
    readFileSync(path.join("security/data/curated-threats.json"), "utf8")
  ) as { hosts: Record<string, string> };
  assert.ok(fixture.host.endsWith(".example"));
  assert.equal(curated.hosts[fixture.host], fixture.threatState);
  assert.equal(fixture.listFile, "security/data/curated-threats.json");
  const notes = Array.isArray(fixture.notes) ? fixture.notes.join(" ") : String(fixture.notes || "");
  assert.match(notes, /PLAYWRIGHT_LIVE_BASE_URL|soft live/i);
  assert.match(notes, /\.example/);
});
