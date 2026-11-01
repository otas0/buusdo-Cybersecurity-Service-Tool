import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

test("SHIELD_SUPPORT_BLOB shape requires Diagnostics (share) mode", () => {
  require("../extension/shared/support-blob.classic.js");
  const ShieldSupport = (
    globalThis as {
      ShieldSupport?: {
        buildSupportResponse: (
          mode: unknown,
          lastPasteAt: unknown,
          nowIso?: string,
          extras?: {
            trackersApiAnnounceActive?: boolean;
            trackersMutedAnnounced?: boolean;
            accountSignedIn?: boolean;
          }
        ) => {
          ok: boolean;
          error?: string;
          blob?: {
            lastPasteAt: string | null;
            source: string;
            trackersApiAnnounceActive?: boolean;
            trackersMutedAnnounced?: boolean;
            accountSignedIn?: boolean;
          };
        };
      };
    }
  ).ShieldSupport;
  assert.ok(ShieldSupport);

  const denied = ShieldSupport!.buildSupportResponse("off", "2026-10-25T12:00:00.000Z");
  assert.equal(denied.ok, false);
  assert.equal(denied.error, "need-diagnostics");

  const localDenied = ShieldSupport!.buildSupportResponse("local", "2026-10-25T12:00:00.000Z");
  assert.equal(localDenied.ok, false);

  const ok = ShieldSupport!.buildSupportResponse(
    "share",
    "2026-10-25T12:00:00.000Z",
    "2026-10-25T13:00:00.000Z"
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.blob?.lastPasteAt, "2026-10-25T12:00:00.000Z");
  assert.equal(ok.blob?.source, "extension-support");
  assert.equal(
    (ok.blob as { trackersApiAnnounceActive?: boolean; trackersMutedAnnounced?: boolean })
      ?.trackersApiAnnounceActive,
    false
  );
  assert.equal(
    (ok.blob as { trackersMutedAnnounced?: boolean })?.trackersMutedAnnounced,
    false
  );
  assert.equal((ok.blob as { accountSignedIn?: boolean })?.accountSignedIn, false);
  assert.ok(!JSON.stringify(ok).includes("payload"));
  assert.ok(!JSON.stringify(ok).includes("@"));

  const muted = ShieldSupport!.buildSupportResponse(
    "share",
    null,
    "2026-10-25T13:00:00.000Z",
    { trackersApiAnnounceActive: true, trackersMutedAnnounced: true, accountSignedIn: true }
  );
  assert.equal(muted.ok, true);
  assert.equal(
    (muted.blob as { trackersApiAnnounceActive?: boolean })?.trackersApiAnnounceActive,
    true
  );
  assert.equal(
    (muted.blob as { trackersMutedAnnounced?: boolean })?.trackersMutedAnnounced,
    true
  );
  assert.equal((muted.blob as { accountSignedIn?: boolean })?.accountSignedIn, true);
});

test("service worker passes trackersApiAnnounceActive into support blob", () => {
  const sw = readFileSync(join(process.cwd(), "extension/background/service-worker.js"), "utf8");
  assert.match(sw, /trackersApiAnnounceActive/);
  assert.match(sw, /buildSupportResponse\([\s\S]*trackersApiAnnounceActive/);
});