/** Pure helpers for RateLimitBar live-region throttle (testable without DOM). */

/** True when a 5s boundary was crossed while counting down (e.g. 41→39 crossed 40). */
export function crossedFiveSecBoundary(prev: number, sec: number): boolean {
  if (!(sec < prev)) return false;
  for (let b = Math.floor((prev - 1) / 5) * 5; b >= sec; b -= 5) {
    if (prev > b && sec <= b) return true;
  }
  return false;
}

export function shouldAnnounceRateLimitTick(
  prevAnnouncedSec: number | null,
  sec: number,
  prevTotal: number | null = null,
  total: number | null = null
): boolean {
  // Budget / total reset — announce even if remaining sec is unchanged.
  if (prevTotal != null && total != null && prevTotal !== total) return true;
  let prev = prevAnnouncedSec;
  // New countdown (e.g. mid-limit recovery 3→45) — always announce.
  if (prev != null && sec > prev) prev = null;
  const first = prev == null;
  const onBoundary = sec % 5 === 0;
  const ending = sec <= 1;
  // Mid-wait: tick skipped a boundary (announce remaining sec).
  const crossed = prev != null && crossedFiveSecBoundary(prev, sec);
  return first || ending || onBoundary || crossed;
}

/** Mutable announce state used by RateLimitBar (and unit-tested unmount reset). */
export type AnnounceRefs = {
  lastAnnouncedSec: { current: number | null };
  lastTotal: { current: number | null };
};

export function createAnnounceRefs(): AnnounceRefs {
  return {
    lastAnnouncedSec: { current: null },
    lastTotal: { current: null }
  };
}

/** Clear refs so the next RateLimitBar mount starts clean (unmount path). */
export function resetAnnounceRefs(refs: AnnounceRefs): void {
  refs.lastAnnouncedSec.current = null;
  refs.lastTotal.current = null;
}

/** Timer handle for clearing rateLimitAnnounce after header-preferred / cleared copy. */
export type AnnounceClearTimerRef = { current: ReturnType<typeof setTimeout> | null };

type TimerApi = {
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
};

/**
 * Schedule a one-shot clear. A second call cancels the prior timer (e.g. second 429)
 * so a late setState cannot stick over RateLimitBar ticks.
 */
export function scheduleAnnounceClear(
  timerRef: AnnounceClearTimerRef,
  onClear: () => void,
  ms = 4000,
  api: TimerApi = globalThis as TimerApi
): void {
  if (timerRef.current != null) {
    api.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
  timerRef.current = api.setTimeout(() => {
    onClear();
    timerRef.current = null;
  }, ms);
}

/** Cancel a pending announce clear (unmount / new limit). */
export function cancelAnnounceClear(
  timerRef: AnnounceClearTimerRef,
  api: TimerApi = globalThis as TimerApi
): void {
  if (timerRef.current != null) {
    api.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}