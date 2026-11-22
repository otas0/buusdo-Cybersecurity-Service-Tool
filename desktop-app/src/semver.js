/**
 * Tiny semver compare for desktop update / force gates (no dependency).
 * Accepts "0.2.0" or "desktop-v0.2.0" / "v0.2.0".
 */

/** @param {string|null|undefined} raw */
function parseSemver(raw) {
  const s = String(raw || "")
    .trim()
    .replace(/^desktop-v/i, "")
    .replace(/^v/i, "");
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(s);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/**
 * @param {string|null|undefined} a
 * @param {string|null|undefined} b
 * @returns {number} negative if a<b, 0 if equal, positive if a>b; NaN if unparsable
 */
function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return Number.NaN;
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

/** True when installed is strictly below minimum (force update). */
function isBelowMin(installed, minSupported) {
  const c = compareSemver(installed, minSupported);
  return Number.isFinite(c) && c < 0;
}

/** True when remote release is strictly newer than installed. */
function isNewer(remote, installed) {
  const c = compareSemver(remote, installed);
  return Number.isFinite(c) && c > 0;
}

module.exports = { parseSemver, compareSemver, isBelowMin, isNewer };
