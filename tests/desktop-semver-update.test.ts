/**
 * Desktop force / optional update helpers + downloads.json gate.
 *
 *   npx tsx --test tests/desktop-semver-update.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { test } from "node:test";

const root = path.resolve(".");
const require = createRequire(import.meta.url);
const { parseSemver, compareSemver, isBelowMin, isNewer } = require(
  path.join(root, "desktop-app/src/semver.js")
);

test("parseSemver accepts desktop-v / v prefixes", () => {
  assert.deepEqual(parseSemver("0.2.0"), [0, 2, 0]);
  assert.deepEqual(parseSemver("v0.2.1"), [0, 2, 1]);
  assert.deepEqual(parseSemver("desktop-v0.3.0"), [0, 3, 0]);
  assert.equal(parseSemver("not-a-version"), null);
});

test("compareSemver / isBelowMin / isNewer", () => {
  assert.ok(compareSemver("0.1.9", "0.2.0") < 0);
  assert.equal(compareSemver("0.2.0", "0.2.0"), 0);
  assert.ok(compareSemver("0.2.1", "0.2.0") > 0);
  assert.equal(isBelowMin("0.1.0", "0.2.0"), true);
  assert.equal(isBelowMin("0.2.0", "0.2.0"), false);
  assert.equal(isNewer("0.2.1", "0.2.0"), true);
  assert.equal(isNewer("0.2.0", "0.2.0"), false);
});

test("shared/desktop-downloads.json declares minSupportedVersion semver", () => {
  const downloads = JSON.parse(
    readFileSync(path.join(root, "shared/desktop-downloads.json"), "utf8")
  );
  assert.ok(parseSemver(downloads.minSupportedVersion), "minSupportedVersion parsable");
  assert.ok(parseSemver(downloads.releaseTag), "releaseTag parsable");
});

test("desktop update-check + force gate wired in server and dashboard", () => {
  const server = readFileSync(path.join(root, "desktop-app/src/server.js"), "utf8");
  assert.match(server, /forceUpdate/);
  assert.match(server, /minSupportedVersion/);
  assert.match(server, /require\("\.\/semver"\)/);

  const dash = readFileSync(path.join(root, "desktop-app/public/js/dashboard.js"), "utf8");
  assert.match(dash, /forceUpdateGate/);
  assert.match(dash, /applyUpdateCheckResult/);
  assert.match(dash, /honestLimitsItemOffline/);
  assert.match(dash, /optionalUpdateBanner/);
  assert.match(dash, /updateCheckOffline/);
  assert.match(dash, /optionalUpdateDismissedTag/);
  assert.match(dash, /clearStaleOptionalUpdateDismiss/);
  assert.match(dash, /emphasizeForceAfterDownload/);
  assert.match(dash, /forceUpdateAfterDownload/);
  assert.match(dash, /wireForceUpdateDownloadCta/);
  assert.match(dash, /applySameOriginDownloadAttr/);
  assert.match(dash, /optionalUpdateShowHint/);
  assert.match(dash, /syncOptionalUpdateShowHint/);
  assert.match(dash, /syncForceGateChromeAria/);
  assert.match(dash, /forceGateWasUp/);
  assert.match(dash, /focusAfterForceGateClose|focusAfterUpdateChromeHide/);
  assert.match(dash, /focusAfterUpdateChromeHide/);
  assert.match(dash, /focusOptionalUpdateBannerControls/);
  assert.match(dash, /ensureOptionalUpdateDismissFocusable/);
  assert.match(dash, /forceCloseLandedOnShowHint/);
  assert.match(dash, /optional-update-tip-available/);
  assert.match(dash, /optionalUpdateTipAvailable/);
  assert.match(dash, /formatMinSupportedFloorNote|min-supported-floor/);
  assert.match(dash, /showMessageToast[\s\S]{0,200}optionalUpdateTipAvailable/);
  assert.match(dash, /live:\s*"polite"/);
  assert.match(dash, /honestLimitsAck/);
  assert.match(dash, /honestLimitsMinSupportedNote/);
  assert.match(dash, /tipUp/);
  assert.match(dash, /main\.board/);
  assert.match(dash, /setUpdateCheckStatus/);
  assert.match(dash, /data-status/);
  assert.match(dash, /requestAnimationFrame/);
  assert.match(dash, /optionalUpdateDismiss[\s\S]{0,800}focusAfterUpdateChromeHide/);
  assert.match(dash, /showOptionalUpdateBanner[\s\S]{0,1200}focusOptionalUpdateBannerControls/);
  assert.match(dash, /tabIndex\s*=\s*0/);
  assert.match(dash, /update-check-offline/);
  assert.match(dash, /update-check-fail/);
  assert.match(dash, /aria-live/);
  assert.match(dash, /assertive/);
  assert.match(dash, /["']polite["']/);
  assert.match(dash, /role.*status|setAttribute\("role",\s*"status"\)/);
  assert.match(dash, /role.*alert|setAttribute\("role"/);
  assert.match(dash, /\/api\/min-supported/);

  const html = readFileSync(path.join(root, "desktop-app/public/index.html"), "utf8");
  assert.match(html, /data-testid="force-update-gate"/);
  assert.match(html, /class="halt-button"/);
  assert.match(html, /data-testid="optional-update-banner"/);
  assert.match(html, /data-testid="optional-update-show-hint"/);
  assert.match(html, /data-testid="force-update-after-download"/);
  assert.match(html, /data-testid="force-update-setup-guide"/);
  assert.match(html, /id="honestLimitsItemOffline"/);
  assert.match(html, /data-testid="honest-limits-min-supported"/);

  const i18n = readFileSync(path.join(root, "desktop-app/public/js/i18n.js"), "utf8");
  assert.match(i18n, /honestLimitsItemOffline:/);
  assert.match(i18n, /forceUpdateBody:/);
  assert.match(i18n, /forceUpdateAfterDownload:/);
  assert.match(i18n, /optionalUpdateBanner:/);
  assert.match(i18n, /optionalUpdateShowHint:/);
  assert.match(i18n, /updateCheckOffline:/);

  assert.match(server, /\/api\/min-supported/);
  assert.match(server, /min-supported-line/);

  const minLine = readFileSync(path.join(root, "desktop-app/src/min-supported-line.js"), "utf8");
  assert.match(minLine, /readMinSupportedLine/);
  assert.match(minLine, /SHIELD_MIN_SUPPORTED_TXT/);

  const auto = readFileSync(path.join(root, "desktop-app/src/autostart.js"), "utf8");
  assert.match(auto, /optionalUpdateDismissedTag/);
  assert.match(auto, /setOptionalUpdateDismissedTag/);

  const css = readFileSync(path.join(root, "desktop-app/public/css/dashboard.css"), "utf8");
  assert.match(css, /a\.halt-button/);
  assert.match(css, /\.optional-update-banner/);
});
