/**
 * Runtime validation aligned with docs/check-timing.schema.json
 * (additionalProperties: false; required fields; types).
 */

export type CheckTimingLike = {
  parseMs: number;
  threatMs: number;
  probeMs: number | null;
  riskMs: number;
  totalMs: number;
  probeTimeoutMs: number;
  probeHeadFailed: boolean;
  headSkipped: boolean;
  ambiguousProbeStatus: boolean;
};

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
] as const;

const ALLOWED = new Set<string>(REQUIRED);

function isNonNegInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function validateCheckTiming(timing: unknown): { ok: true; timing: CheckTimingLike } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!timing || typeof timing !== "object") {
    return { ok: false, errors: ["timing must be an object"] };
  }
  const t = timing as Record<string, unknown>;
  for (const key of Object.keys(t)) {
    if (!ALLOWED.has(key)) errors.push(`unexpected property ${key}`);
  }
  for (const key of REQUIRED) {
    if (!(key in t)) errors.push(`missing ${key}`);
  }
  for (const key of ["parseMs", "threatMs", "riskMs", "totalMs"] as const) {
    if (key in t && !isNonNegInt(t[key])) errors.push(`${key} must be integer >= 0`);
  }
  if ("probeTimeoutMs" in t) {
    if (typeof t.probeTimeoutMs !== "number" || !Number.isInteger(t.probeTimeoutMs) || t.probeTimeoutMs < 1) {
      errors.push("probeTimeoutMs must be integer >= 1");
    }
  }
  if ("probeMs" in t && t.probeMs !== null && !isNonNegInt(t.probeMs)) {
    errors.push("probeMs must be integer >= 0 or null");
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
  if (errors.length) return { ok: false, errors };
  return { ok: true, timing: t as CheckTimingLike };
}