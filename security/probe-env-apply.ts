/**
 * Shared apply path for POST /api/dev/probe-env (unit-tested).
 * Always hot-applies runtime overrides; persists via upsertEnvLocalLine
 * (.env.local or runtime fallback).
 */
import {
  getConfiguredProbeTimeoutMs,
  setRuntimeProbeTimeoutMs
} from "./probe-budget";
import { isOwnThreatMergePtEnabled, setRuntimeOwnThreatMergePt } from "./env-local";
import { upsertEnvLocalLine, type UpsertEnvResult } from "./env-local-write";
import { PROBE_TIMEOUT_ENV_KEY } from "../shared/probe-budget-copy.mjs";

export type ProbeEnvBody = { ms?: number; ownThreatMergePt?: boolean };

export type ProbeEnvApplyResult = {
  ok: true;
  path: string | null;
  /** Set when persistence used the runtime fallback file (not .env.local). */
  usedFallbackPath?: string;
  lines: string[];
  fileWriteDenied?: boolean;
  probeTimeoutMs: number;
  ownThreatMergePt: boolean;
};

type WriteFn = (key: string, value: string) => UpsertEnvResult;

/**
 * Apply probe timeout and/or MERGE_PT. `writeLine` is injectable for EPERM tests.
 */
export function applyProbeEnvUpdates(
  body: ProbeEnvBody,
  writeLine: WriteFn = upsertEnvLocalLine
): ProbeEnvApplyResult | { ok: false; error: string; status: number } {
  const lines: string[] = [];
  let usedFallback = false;
  let lastPath: string | null = null;
  let usedFallbackPath: string | undefined;

  if (body.ms != null) {
    const ms = Number(body.ms);
    if (!Number.isInteger(ms) || ms < 500 || ms > 120_000) {
      return { ok: false, error: "invalid-ms", status: 400 };
    }
    setRuntimeProbeTimeoutMs(ms);
    try {
      const written = writeLine(PROBE_TIMEOUT_ENV_KEY, String(ms));
      lines.push(written.line);
      lastPath = written.path;
      if (written.usedFallback) {
        usedFallback = true;
        usedFallbackPath = written.path;
      }
    } catch {
      usedFallback = true;
      lines.push(`${PROBE_TIMEOUT_ENV_KEY}=${ms}`);
      lastPath = null;
    }
  }

  if (typeof body.ownThreatMergePt === "boolean") {
    const flag = body.ownThreatMergePt ? "1" : "0";
    setRuntimeOwnThreatMergePt(flag);
    try {
      const written = writeLine("OWN_THREAT_MERGE_PT", flag);
      lines.push(written.line);
      lastPath = written.path;
      if (written.usedFallback) {
        usedFallback = true;
        usedFallbackPath = written.path;
      }
    } catch {
      usedFallback = true;
      lines.push(`OWN_THREAT_MERGE_PT=${flag}`);
      lastPath = null;
    }
  }

  if (!lines.length) {
    return { ok: false, error: "nothing-to-write", status: 400 };
  }

  return {
    ok: true,
    path: usedFallback && lastPath == null ? null : lastPath,
    usedFallbackPath,
    lines,
    fileWriteDenied: usedFallback || undefined,
    probeTimeoutMs: getConfiguredProbeTimeoutMs(),
    ownThreatMergePt: isOwnThreatMergePtEnabled()
  };
}