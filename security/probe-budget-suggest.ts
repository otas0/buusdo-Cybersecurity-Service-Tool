/**
 * Pure probe-timeout suggestion helpers — safe for client bundles (no node:fs).
 */
export const PROBE_TIMEOUT_FORMULA = "ceil(maxObservedProbeMs × 1.2) rounded up to 100ms";

export type ProbeTimeoutSuggestion = {
  currentMs: number;
  maxObservedMs: number | null;
  suggestedMs: number;
  shouldRaise: boolean;
  formula: string;
};

/**
 * Suggest a new CHECK_PROBE_TIMEOUT_MS from the worst timed-out probe in local history.
 * When there is no timeout history, suggested equals current.
 */
export function suggestProbeTimeoutMs(
  currentMs: number,
  maxObservedProbeMs: number | null | undefined
): ProbeTimeoutSuggestion {
  const current = currentMs > 0 ? currentMs : 5000;
  const formula = PROBE_TIMEOUT_FORMULA;
  if (maxObservedProbeMs == null || maxObservedProbeMs <= 0) {
    return {
      currentMs: current,
      maxObservedMs: null,
      suggestedMs: current,
      shouldRaise: false,
      formula
    };
  }
  const raw = Math.ceil(maxObservedProbeMs * 1.2);
  const suggestedMs = Math.ceil(raw / 100) * 100;
  return {
    currentMs: current,
    maxObservedMs: maxObservedProbeMs,
    suggestedMs: Math.max(suggestedMs, current),
    shouldRaise: suggestedMs > current,
    formula
  };
}

export function maxProbeAmongTimeouts(
  rows: Array<{ timeouts: number; maxProbeMs: number | null }>
): number | null {
  let max: number | null = null;
  for (const row of rows) {
    if (row.timeouts <= 0 || row.maxProbeMs == null) continue;
    max = max == null ? row.maxProbeMs : Math.max(max, row.maxProbeMs);
  }
  return max;
}