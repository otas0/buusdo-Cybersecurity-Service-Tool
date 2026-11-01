import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  cancelAnnounceClear,
  createAnnounceRefs,
  resetAnnounceRefs,
  scheduleAnnounceClear,
  shouldAnnounceRateLimitTick,
  type AnnounceClearTimerRef
} from "../components/rate-limit-announce";

test("jump from 3→45 re-announces immediately", () => {
  assert.equal(shouldAnnounceRateLimitTick(3, 45), true);
});

test("throttles mid-countdown between 5s boundaries", () => {
  assert.equal(shouldAnnounceRateLimitTick(45, 44), false);
  assert.equal(shouldAnnounceRateLimitTick(45, 40), true);
  assert.equal(shouldAnnounceRateLimitTick(null, 37), true);
  assert.equal(shouldAnnounceRateLimitTick(2, 1), true);
});

test("announces remaining seconds when countdown crosses a 5s boundary mid-wait", () => {
  // Skipped tick 41→39 crossed 40 — still announce (RateLimitBar live region).
  assert.equal(shouldAnnounceRateLimitTick(41, 39), true);
  assert.equal(shouldAnnounceRateLimitTick(42, 37), true);
  assert.equal(shouldAnnounceRateLimitTick(41, 40), true);
  assert.equal(shouldAnnounceRateLimitTick(45, 44), false);
});

test("RateLimitBar wires data-valuetext-synced for cross skipped ticks", () => {
  const src = readFileSync(join(process.cwd(), "components/RateLimitBar.tsx"), "utf8");
  assert.match(src, /data-valuetext-synced/);
  assert.match(src, /data-valuetext-synced=\{announceReason === "cross"/);
  assert.match(src, /reason === "cross"/);
  assert.match(src, /crossedFiveSecBoundary/);
  assert.match(src, /setCrossValueText/);
});

test("announces when total budget changes even if sec unchanged", () => {
  // Use non-boundary remaining sec so only the total-change rule fires.
  assert.equal(shouldAnnounceRateLimitTick(31, 31, 60, 90), true);
  assert.equal(shouldAnnounceRateLimitTick(31, 31, 60, 60), false);
});

test("AppShell announces remaining seconds when Retry-After header is preferred", () => {
  const src = readFileSync(join(process.cwd(), "components/AppShell.tsx"), "utf8");
  assert.match(src, /retryAfterHeaderPreferred/);
  assert.match(src, /headerPreferred/);
  assert.match(src, /setRateLimitAnnounce/);
  assert.match(src, /rateLimitTick/);
  assert.match(src, /rateLimitAnnounceClearTimer/);
  assert.match(src, /scheduleAnnounceClear/);
  assert.match(src, /clearRateLimitAnnounceSoon/);
  // Comment must name this file's second-429 test title (rename both together).
  assert.match(
    src,
    /scheduleAnnounceClear clears prior timer on a second 429/
  );
});

test("scheduleAnnounceClear clears prior timer on a second 429", () => {
  const timerRef: AnnounceClearTimerRef = { current: null };
  const calls: number[] = [];
  let nextId = 1;
  const live = new Map<number, () => void>();
  const api = {
    setTimeout(fn: () => void, _ms?: number) {
      const id = nextId++;
      live.set(id, fn);
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimeout(id: ReturnType<typeof setTimeout>) {
      live.delete(id as unknown as number);
    }
  } as { setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout };

  scheduleAnnounceClear(timerRef, () => calls.push(1), 4000, api);
  const first = timerRef.current;
  assert.ok(first != null);
  scheduleAnnounceClear(timerRef, () => calls.push(2), 4000, api);
  assert.notEqual(timerRef.current, first, "second 429 replaces timer handle");
  assert.equal(live.has(first as unknown as number), false, "first timer cleared");

  const second = timerRef.current as unknown as number;
  live.get(second)?.();
  assert.deepEqual(calls, [2]);
  assert.equal(timerRef.current, null);

  scheduleAnnounceClear(timerRef, () => calls.push(3), 4000, api);
  cancelAnnounceClear(timerRef, api);
  assert.equal(timerRef.current, null);
  assert.deepEqual(calls, [2]);
});

test("createAnnounceRefs + resetAnnounceRefs clears unmount path for next limit", () => {
  const refs = createAnnounceRefs();
  refs.lastAnnouncedSec.current = 45;
  refs.lastTotal.current = 60;
  assert.equal(
    shouldAnnounceRateLimitTick(
      refs.lastAnnouncedSec.current,
      44,
      refs.lastTotal.current,
      60
    ),
    false
  );
  resetAnnounceRefs(refs);
  assert.equal(refs.lastAnnouncedSec.current, null);
  assert.equal(refs.lastTotal.current, null);
  assert.equal(
    shouldAnnounceRateLimitTick(
      refs.lastAnnouncedSec.current,
      45,
      refs.lastTotal.current,
      60
    ),
    true
  );
});