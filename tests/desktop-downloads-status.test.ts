/**
 * /api/desktop-downloads/status JSON shape (minSupportedSource passthrough).
 *
 *   node --import tsx --test tests/desktop-downloads-status.test.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import desktopDownloads from "../shared/desktop-downloads.json" with { type: "json" };
import { GET } from "../app/api/desktop-downloads/status/route";

test("GET /api/desktop-downloads/status exposes minSupportedSource + version", async () => {
  const res = await GET();
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    ok?: boolean;
    minSupportedVersion?: string | null;
    minSupportedSource?: string | null;
    macNote?: string;
  };
  assert.equal(body.ok, true);
  assert.equal(body.minSupportedSource, "desktop-downloads.json");
  assert.equal(
    body.minSupportedVersion,
    String(desktopDownloads.minSupportedVersion || "").trim() || null
  );
  assert.ok(
    body.macNote === "none" ||
      body.macNote === "unsigned-until-promote" ||
      body.macNote === "ready-to-promote"
  );
});
