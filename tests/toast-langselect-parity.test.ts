import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

test("toast COPY locale order starts with langSelect option order", () => {
  const html = readFileSync(path.join("extension/popup/popup.html"), "utf8");
  const block = html.match(/id="langSelect"[\s\S]*?<\/select>/);
  assert.ok(block, "langSelect missing");
  const selectOrder = [...block![0].matchAll(/<option\s+value="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(selectOrder.length >= 3, "langSelect should list core locales");

  const copy = JSON.parse(
    readFileSync(path.join("extension/content/phishing-toast-i18n.json"), "utf8")
  ) as Record<string, unknown>;
  const copyKeys = Object.keys(copy);

  for (const id of selectOrder) {
    assert.ok(copy[id], `toast COPY missing langSelect locale ${id}`);
  }

  // First N COPY keys that are in langSelect must appear in the same relative order.
  const selectInCopy = copyKeys.filter((k) => selectOrder.includes(k));
  assert.deepEqual(
    selectInCopy,
    selectOrder.filter((id) => copy[id]),
    "langSelect order must match toast COPY key order for shared locales"
  );
});
