/**
 * Live probe Analysis carries minSupported* for RiskResult resolveFromStatus.
 *
 *   node --import tsx --test tests/analyse-min-supported-floor.test.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import desktopDownloads from "../shared/desktop-downloads.json" with { type: "json" };
import { analyseWebsite } from "../security/analyse";

test("live Analysis attaches minSupportedVersion + minSupportedSource", async () => {
  const analysis = await analyseWebsite("https://example.com/", {
    live: {
      resolved: true,
      addresses: ["93.184.216.34"],
      reachable: true,
      statusCode: 200,
      finalUrl: "https://example.com/",
      redirectChain: [],
      redirected: false,
      crossDomainRedirect: false,
      tlsOk: true,
      error: null,
      timedOut: false,
      probeHeadFailed: false
    }
  });
  assert.equal(analysis.minSupportedVersion, String(desktopDownloads.minSupportedVersion || "").trim());
  assert.equal(analysis.minSupportedSource, "desktop-downloads.json");
});

test("offline Analysis omits minSupported* floor metadata", async () => {
  const analysis = await analyseWebsite("https://example.com/", { live: false });
  assert.equal(
    (analysis as { minSupportedVersion?: string }).minSupportedVersion,
    undefined
  );
  assert.equal(
    (analysis as { minSupportedSource?: string }).minSupportedSource,
    undefined
  );
});
