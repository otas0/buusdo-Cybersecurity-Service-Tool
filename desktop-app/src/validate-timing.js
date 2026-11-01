/**
 * Validate analysis.timing against docs/check-timing.schema.json
 * (field requirements mirrored — see TIMING_SCHEMA.md).
 */

const REQUIRED = [
  "parseMs",
  "threatMs",
  "probeMs",
  "riskMs",
  "totalMs",
  "probeTimeoutMs",
  "probeHeadFailed",
  "headSkipped",
  "ambiguousProbeStatus"
];

/**
 * @param {unknown} timing
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateCheckTiming(timing) {
  const errors = [];
  if (!timing || typeof timing !== "object") {
    return { ok: false, errors: ["timing must be an object"] };
  }
  const t = /** @type {Record<string, unknown>} */ (timing);
  for (const key of REQUIRED) {
    if (!(key in t)) errors.push(`missing ${key}`);
  }
  for (const key of ["parseMs", "threatMs", "riskMs", "totalMs", "probeTimeoutMs"]) {
    if (key in t && typeof t[key] !== "number") errors.push(`${key} must be number`);
  }
  if ("probeTimeoutMs" in t && typeof t.probeTimeoutMs === "number" && t.probeTimeoutMs < 1) {
    errors.push("probeTimeoutMs must be >= 1");
  }
  if ("probeMs" in t && t.probeMs !== null && typeof t.probeMs !== "number") {
    errors.push("probeMs must be number or null");
  }
  if ("probeHeadFailed" in t && typeof t.probeHeadFailed !== "boolean") {
    errors.push("probeHeadFailed must be boolean");
  }
  if ("headSkipped" in t && typeof t.headSkipped !== "boolean") {
    errors.push("headSkipped must be boolean");
  }
  if ("ambiguousProbeStatus" in t && typeof t.ambiguousProbeStatus !== "boolean") {
    errors.push("ambiguousProbeStatus must be boolean");
  }
  return { ok: errors.length === 0, errors };
}

module.exports = { validateCheckTiming };