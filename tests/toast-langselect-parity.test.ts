import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

test("toast COPY locale order starts with extension-ui-locales catalog order", () => {
  const catalog = JSON.parse(
    readFileSync(path.join("extension/shared/extension-ui-locales.json"), "utf8")
  ) as { order: string[]; extraToastPacks?: string[] };
  const selectOrder = catalog.order || [];
  assert.ok(selectOrder.length >= 3, "extension-ui-locales order should list core locales");

  const copy = JSON.parse(
    readFileSync(path.join("extension/content/phishing-toast-i18n.json"), "utf8")
  ) as Record<string, unknown>;
  const copyKeys = Object.keys(copy);

  for (const id of selectOrder) {
    assert.ok(copy[id], `toast COPY missing catalog locale ${id}`);
  }

  // First N COPY keys that are in catalog must appear in the same relative order.
  const selectInCopy = copyKeys.filter((k) => selectOrder.includes(k));
  assert.deepEqual(
    selectInCopy,
    selectOrder.filter((id) => copy[id]),
    "catalog order must match toast COPY key order for shared locales"
  );
});
