/**
 * #machineScan hash focus vs SSE `machine` updates (browser + tests).
 * Hash focus only scrolls when the ask UI is already up — never clears a decision.
 */

export function shouldFocusAskDecline(state) {
  return Boolean(state?.askVisible) && !Boolean(state?.alreadyOpen);
}

export function hashFocusOnlyScrolls(state) {
  return Boolean(state?.askVisible) || Boolean(state?.alreadyOpen);
}