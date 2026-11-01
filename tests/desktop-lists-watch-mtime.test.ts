import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

test("lists-store watch listener receives { mtimeMs, path } after temp-file write", async () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-lists-watch-"));
  const file = join(dir, "shield-backup.json");
  process.env.SHIELD_LISTS_PATH = file;

  delete require.cache[require.resolve("../desktop-app/src/lists-store.js")];
  const listsStore = require("../desktop-app/src/lists-store.js") as {
    startListsWatch: () => void;
    onListsChange: (fn: (lists: unknown, meta?: { mtimeMs: number | null; path: string }) => void) => () => void;
    writeLists: (lists: unknown) => Promise<unknown>;
    loadMod: () => Promise<{ emptyLists: () => unknown; addBlocked: (l: unknown, d: string) => unknown }>;
    listsPath: () => string;
  };

  mkdirSync(dir, { recursive: true });
  writeFileSync(
    file,
    JSON.stringify({
      schema: "shield-lists-v1",
      updatedAt: "2026-10-25T12:00:00.000Z",
      blocked: [],
      trusted: []
    }),
    "utf8"
  );

  const got = await new Promise<{ lists: unknown; meta?: { mtimeMs: number | null; path: string } }>(
    (resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("watch timeout")), 5000);
      listsStore.startListsWatch();
      const off = listsStore.onListsChange((lists, meta) => {
        clearTimeout(timer);
        off();
        resolve({ lists, meta });
      });
      // External Syncthing-style write after watch is armed.
      setTimeout(() => {
        writeFileSync(
          file,
          JSON.stringify({
            schema: "shield-lists-v1",
            updatedAt: "2026-10-25T12:01:00.000Z",
            blocked: [{ domain: "watch.example", reason: "user" }],
            trusted: []
          }),
          "utf8"
        );
      }, 50);
    }
  );

  assert.ok(got.meta);
  assert.equal(got.meta!.path, listsStore.listsPath());
  assert.ok(typeof got.meta!.mtimeMs === "number" && Number.isFinite(got.meta!.mtimeMs));

  delete process.env.SHIELD_LISTS_PATH;
  delete require.cache[require.resolve("../desktop-app/src/lists-store.js")];
  rmSync(dir, { recursive: true, force: true });
});