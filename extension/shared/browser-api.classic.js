/**
 * Classic (non-module) API handle for the background service worker.
 * Safari does not accept background.type = module.
 */
var api = globalThis.browser || globalThis.chrome;
if (!api) {
  throw new Error("buusdo needs the WebExtension API (Chrome or Safari).");
}