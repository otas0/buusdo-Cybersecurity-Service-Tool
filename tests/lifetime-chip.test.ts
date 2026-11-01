import assert from "node:assert/strict";
import { test } from "node:test";
import { afterRingClear, lifetimeChipTitles } from "../desktop-app/public/js/lifetime-chip.mjs";

test("lifetimeChipTitles clears parent tip when total is 0", () => {
  const tip = "Lifetime session total (Σ).";
  const empty = lifetimeChipTitles(0, tip);
  assert.equal(empty.show, false);
  assert.equal(empty.title, "");
  assert.equal(empty.parentTitle, "");

  const live = lifetimeChipTitles(3, tip);
  assert.equal(live.show, true);
  assert.equal(live.title, tip);
  assert.equal(live.parentTitle, tip);
});

test("afterRingClear zeroes ring blocks without wiping lifetime Σ", () => {
  const tip = "Lifetime session total (Σ).";
  const cleared = afterRingClear(7, tip);
  assert.deepEqual(cleared.ringBlocks, []);
  assert.equal(cleared.lifetime.show, true);
  assert.equal(cleared.lifetime.parentTitle, tip);
});