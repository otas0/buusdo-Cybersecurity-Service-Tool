/**
 * Shared WebExtension API handle for Chrome and Safari.
 * Safari exposes `browser`; Chromium exposes `chrome`. Prefer `browser` when both exist.
 */
export const api = globalThis.browser ?? globalThis.chrome;

if (!api) {
  throw new Error("buusdo needs the WebExtension API (Chrome or Safari).");
}