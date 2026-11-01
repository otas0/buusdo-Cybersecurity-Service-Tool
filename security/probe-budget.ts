/**
 * Server probe timeout budget (CHECK_PROBE_TIMEOUT_MS) — reads .env.local via Node fs.
 * Client components must import suggest helpers from probe-budget-suggest.ts only.
 */
import { readEnvLocalValue } from "./env-local-file";

export {
  PROBE_TIMEOUT_FORMULA,
  maxProbeAmongTimeouts,
  suggestProbeTimeoutMs,
  type ProbeTimeoutSuggestion
} from "./probe-budget-suggest";

const ENV_KEY = "CHECK_PROBE_TIMEOUT_MS";

/** In-memory override after Settings writes .env.local (hot path without process restart). */
let runtimeOverrideMs: number | null = null;

export function setRuntimeProbeTimeoutMs(ms: number | null) {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) {
    runtimeOverrideMs = null;
    return;
  }
  runtimeOverrideMs = Math.round(ms);
}

export function getConfiguredProbeTimeoutMs(): number {
  if (runtimeOverrideMs != null && runtimeOverrideMs > 0) return runtimeOverrideMs;
  const fromFile = readEnvLocalValue(ENV_KEY);
  if (fromFile != null) {
    const value = Number(fromFile);
    if (Number.isFinite(value) && value > 0) return value;
  }
  const raw = Number(process.env.CHECK_PROBE_TIMEOUT_MS || 5000);
  return Number.isFinite(raw) && raw > 0 ? raw : 5000;
}