/**
 * Hot-read OWN_THREAT_MERGE_PT (runtime override + .env.local + process.env).
 * File I/O lives in env-local-file.ts (server-only). Client code must not import this module.
 */
import { readEnvLocalValue } from "./env-local-file";

export { readEnvLocalValue } from "./env-local-file";

/** OWN_THREAT_MERGE_PT — file overrides process.env when present. */
let mergePtOverride: "0" | "1" | null = null;

export function setRuntimeOwnThreatMergePt(value: "0" | "1" | null) {
  mergePtOverride = value;
}

/**
 * True unless explicitly disabled (`0`).
 * Order: runtime override → .env.local → process.env (default merge on).
 */
export function isOwnThreatMergePtEnabled(): boolean {
  if (mergePtOverride != null) return mergePtOverride !== "0";
  const fromFile = readEnvLocalValue("OWN_THREAT_MERGE_PT");
  if (fromFile === "0") return false;
  if (fromFile === "1") return true;
  return process.env.OWN_THREAT_MERGE_PT !== "0";
}