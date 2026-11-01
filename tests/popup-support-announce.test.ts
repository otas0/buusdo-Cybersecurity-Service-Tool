import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("popup announces Diagnostics requirement via listsStatus live region", () => {
  const html = readFileSync(join(process.cwd(), "extension/popup/popup.html"), "utf8");
  assert.match(html, /id="listsStatus"[^>]*aria-live="polite"/);
  const js = readFileSync(join(process.cwd(), "extension/popup/popup.js"), "utf8");
  assert.match(js, /function announceSupportNeedDiagIfDisabled/);
  assert.match(js, /aria-describedby.*listsStatus|setAttribute\("aria-describedby", "listsStatus"\)/);
  assert.match(js, /privacyMode !== "share"\) announceSupportNeedDiagIfDisabled/);
  assert.match(js, /else setListsStatus\(""\)/);
  assert.match(js, /listsSupportNeedDiag/);
  const i18n = readFileSync(join(process.cwd(), "extension/shared/i18n.js"), "utf8");
  assert.match(i18n, /listsSupportNeedDiag:\s*"Choose Diagnostics under Data to export\."/);
  // Short, complete sentence for VoiceOver / aria-live (no trailing fragments).
  assert.equal(/listsSupportNeedDiag:\s*"[^"]{12,72}"/.test(i18n), true);
});

test("popup shows mute-window chip when support blob trackersApiAnnounceActive (share only)", () => {
  const html = readFileSync(join(process.cwd(), "extension/popup/popup.html"), "utf8");
  assert.match(html, /id="trackersMuteWindowChip"/);
  assert.match(html, /data-testid="trackers-mute-window-chip"/);
  const js = readFileSync(join(process.cwd(), "extension/popup/popup.js"), "utf8");
  assert.match(js, /function updateMuteWindowChip/);
  assert.match(js, /trackersApiAnnounceActive/);
  assert.match(js, /updateMuteWindowChip\(res\.blob\?\.trackersApiAnnounceActive === true\)/);
  // Also from lastScan without requiring support-blob click (share only).
  assert.match(js, /updateMuteWindowChip\(lastScan\?\.trackersApiAnnounceActive === true\)/);
  // Auto-clear via createTrackersAnnounceClearScheduler (no second support-blob copy).
  assert.match(js, /clearTrackersApiAnnounceSoon/);
  assert.match(js, /createTrackersAnnounceClearScheduler/);
  assert.match(js, /updateMuteWindowChip\(false\)/);
  const i18n = readFileSync(join(process.cwd(), "extension/shared/i18n.js"), "utf8");
  assert.match(i18n, /trackersMuteWindowChip:/);
});