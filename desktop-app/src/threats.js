/**
 * Loads the shared address checker before the proxy accepts traffic.
 * Personal shield-lists-v1 blocks/trusts are applied on top of detect.mjs.
 */

const path = require("path");
const { pathToFileURL } = require("url");
const { sharedRoot } = require("./shared-root");
const listsStore = require("./lists-store");

let classifyUrlBase = () => ({ kind: null, reason: null, host: null, display: "" });
let countThirdPartyTrackersFn = () => 0;
let listsMod = null;

async function loadDetector() {
  const href = pathToFileURL(path.join(sharedRoot(), "detect.mjs")).href;
  const mod = await import(href);
  classifyUrlBase = mod.classifyUrl;
  countThirdPartyTrackersFn =
    typeof mod.countThirdPartyTrackers === "function"
      ? mod.countThirdPartyTrackers
      : () => 0;
  listsMod = await listsStore.loadMod();
  await listsStore.readLists();
}

function hostFromResult(result, urlString) {
  if (result?.host) return result.host;
  try {
    return listsMod.normalizeListHost(urlString);
  } catch {
    return null;
  }
}

function classify(urlString) {
  const result = classifyUrlBase(urlString);
  if (!listsMod) return result;

  const snapshot = listsStore.peekCache();
  if (!snapshot) return result;

  const host = hostFromResult(result, urlString);
  if (!host) return result;

  if (listsMod.isDomainBlockedInLists(snapshot, host)) {
    const display = result.display || host;
    return { kind: "user-block", reason: "user-block", host, display };
  }

  if (
    result.kind === "phishing" &&
    listsMod.isDomainTrustedInLists(snapshot, host)
  ) {
    return { kind: null, reason: null, host, display: result.display || host };
  }

  return result;
}

/**
 * Third-party-only tracker count for a page URL + optional resource URLs
 * (sameBrandFamily ignored — YouTube/DoubleClick must not flip Hold/Clear).
 * @param {string} pageUrl
 * @param {string[]} [resourceUrls]
 */
function countThirdPartyTrackers(pageUrl, resourceUrls) {
  return countThirdPartyTrackersFn(pageUrl, resourceUrls || []);
}

module.exports = {
  loadDetector,
  classifyUrl: classify,
  countThirdPartyTrackers
};