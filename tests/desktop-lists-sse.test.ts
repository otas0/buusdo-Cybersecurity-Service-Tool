import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { lifetimeChipTitles } from "../desktop-app/public/js/lifetime-chip.mjs";

const require = createRequire(import.meta.url);

test("SSE subscribe receives lists after emitLists (debounced duplicates suppressed)", () => {
  process.env.SHIELD_LISTS_SSE_DEBOUNCE_MS = "600";
  delete require.cache[require.resolve("../desktop-app/src/state.js")];
  const state = require("../desktop-app/src/state.js");

  const events: Array<{ type: string; payload: { lists: { blocked: Array<{ domain: string }> }; path: string } }> =
    [];
  const unsub = state.subscribe((evt: { type: string; payload: (typeof events)[0]["payload"] }) => {
    if (evt.type === "lists") events.push(evt as (typeof events)[0]);
  });

  const lists = {
    schema: "shield-lists-v1",
    updatedAt: "2026-10-25T12:00:00.000Z",
    blocked: [{ domain: "a.example", reason: "user", createdAt: "2026-10-25T12:00:00.000Z" }],
    trusted: []
  };

  assert.equal(state.emitLists(lists, "/tmp/shield-backup.json"), true);
  assert.equal(state.emitLists(lists, "/tmp/shield-backup.json"), false); // duplicate within debounce
  assert.equal(events.length, 1);
  assert.equal(events[0].payload.lists.blocked[0].domain, "a.example");
  assert.equal(events[0].payload.path, "/tmp/shield-backup.json");

  unsub();
  delete process.env.SHIELD_LISTS_SSE_DEBOUNCE_MS;
});

test("after SSE lists debounce, lifetime chip tips clear when filter totals reset to 0", () => {
  process.env.SHIELD_LISTS_SSE_DEBOUNCE_MS = "50";
  delete require.cache[require.resolve("../desktop-app/src/state.js")];
  const state = require("../desktop-app/src/state.js");

  let listsEvents = 0;
  const unsub = state.subscribe((evt: { type: string }) => {
    if (evt.type === "lists") listsEvents += 1;
  });

  const tip = "Lifetime session total (Σ).";
  // Simulate dashboard chip after blocks, then a reset snap (totals 0) after lists SSE.
  let chip = lifetimeChipTitles(4, tip);
  assert.equal(chip.show, true);
  assert.equal(chip.parentTitle, tip);

  const lists = {
    schema: "shield-lists-v1",
    updatedAt: "2026-10-25T12:01:00.000Z",
    blocked: [],
    trusted: []
  };
  assert.equal(state.emitLists(lists, "/tmp/shield-backup.json"), true);
  assert.equal(state.emitLists(lists, "/tmp/shield-backup.json"), false);
  assert.equal(listsEvents, 1);

  // Filter / session reset path: dashboard calls updateLifetimeChip(el, 0).
  chip = lifetimeChipTitles(0, tip);
  assert.equal(chip.show, false);
  assert.equal(chip.title, "");
  assert.equal(chip.parentTitle, "");

  unsub();
  delete process.env.SHIELD_LISTS_SSE_DEBOUNCE_MS;
});