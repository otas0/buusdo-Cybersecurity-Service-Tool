/**
 * Extension popup clear-stay: prefer updating an open China Pages tab (same origin).
 *
 *   npx tsx --test tests/popup-china-pages-open.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { openChinaPagesUrl } from "../extension/shared/china-pages-open.mjs";

const ORIGIN = "https://otas0.github.io";
const CLEAR = "https://otas0.github.io/buusdocst/?china_stay=0";

test("popup imports openChinaPagesUrl for clear-stay same-origin path", () => {
  const popup = readFileSync(join(process.cwd(), "extension/popup/popup.js"), "utf8");
  assert.match(popup, /openChinaPagesUrl/);
  assert.match(popup, /preferSameOrigin:\s*true/);
  assert.match(popup, /china-stay-clear-link/);
});

test("fixture: clear-stay updates existing China Pages tab (same origin)", async () => {
  const updates: Array<{ id: number; url: string }> = [];
  const opens: string[] = [];
  const result = await openChinaPagesUrl({
    url: CLEAR,
    origin: ORIGIN,
    preferSameOrigin: true,
    tabs: {
      query: async () => [
        { id: 7, url: "https://otas0.github.io/buusdocst/?china_stay=1", windowId: 1 },
        { id: 9, url: "https://example.com/" }
      ],
      update: async (id, props) => {
        updates.push({ id, url: String(props.url) });
      }
    },
    windows: {
      update: async () => undefined
    },
    openBlank: (u) => {
      opens.push(u);
    }
  });
  assert.equal(result, "same-origin");
  assert.deepEqual(updates, [{ id: 7, url: CLEAR }]);
  assert.equal(opens.length, 0);
});

test("fixture: clear-stay opens blank when no China Pages tab", async () => {
  const opens: string[] = [];
  const result = await openChinaPagesUrl({
    url: CLEAR,
    origin: ORIGIN,
    preferSameOrigin: true,
    tabs: {
      query: async () => [{ id: 3, url: "https://buusdocst.mtsu.workers.dev/en" }],
      update: async () => {
        throw new Error("should not update");
      }
    },
    openBlank: (u) => {
      opens.push(u);
    }
  });
  assert.equal(result, "blank");
  assert.deepEqual(opens, [CLEAR]);
});
