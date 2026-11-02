import assert from "node:assert/strict";
import { test } from "node:test";
import desktopDownloads from "../shared/desktop-downloads.json" with { type: "json" };
import {
  clearTestDownloads,
  clearTestDownloadsInit,
  macMirrorUrl,
  resolveDesktopDownloads,
  withTestDownloads
} from "../shared/desktop-downloads-resolve";

test("clearTestDownloadsInit then resolveDesktopDownloads returns repo JSON", () => {
  const g = globalThis as typeof globalThis & {
    window?: typeof globalThis;
    __SHIELD_TEST_DESKTOP_DOWNLOADS__?: unknown;
  };
  const prevWindow = g.window;
  g.window = g;

  const stub = withTestDownloads({
    mirrors: { macosAppZipUrl: "https://cdn.example.test/PreventiveShield-macos-app.zip" }
  });
  g.window.__SHIELD_TEST_DESKTOP_DOWNLOADS__ = stub;
  assert.equal(macMirrorUrl(), "https://cdn.example.test/PreventiveShield-macos-app.zip");
  assert.notEqual(resolveDesktopDownloads(), desktopDownloads);

  clearTestDownloadsInit();
  clearTestDownloads();

  const resolved = resolveDesktopDownloads();
  assert.equal(resolved, desktopDownloads);
  assert.equal(macMirrorUrl(resolved), "");
  assert.equal(String(resolved.mirrors?.macosAppZipUrl || "").trim(), "");

  if (prevWindow === undefined) delete g.window;
  else g.window = prevWindow;
});