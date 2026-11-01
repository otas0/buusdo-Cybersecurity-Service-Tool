import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("recentBlocks caps user-block entries so other kinds remain", () => {
  delete require.cache[require.resolve(join(root, "desktop-app/src/state.js"))];
  delete require.cache[require.resolve(join(root, "desktop-app/src/log-store.js"))];
  const state = require(join(root, "desktop-app/src/state.js")) as {
    setPrefs: (p: { privacyMode: string }) => void;
    recordBlock: (e: {
      kind: string;
      source: string;
      display: string;
    }) => void;
    snapshot: () => { recentBlocks: Array<{ kind: string }> };
    MAX_USER_BLOCK_LOG: number;
  };

  state.setPrefs({ privacyMode: "local" });
  for (let i = 0; i < state.MAX_USER_BLOCK_LOG + 8; i++) {
    state.recordBlock({ kind: "user-block", source: "test", display: `u${i}.example` });
  }
  state.recordBlock({ kind: "tracker", source: "test", display: "tracker.example" });
  state.recordBlock({ kind: "phishing", source: "test", display: "phish.example" });

  const blocks = state.snapshot().recentBlocks;
  const users = blocks.filter((b) => b.kind === "user-block");
  assert.ok(users.length <= state.MAX_USER_BLOCK_LOG);
  assert.ok(blocks.some((b) => b.kind === "tracker"));
  assert.ok(blocks.some((b) => b.kind === "phishing"));
  state.setPrefs({ privacyMode: "off" });
});