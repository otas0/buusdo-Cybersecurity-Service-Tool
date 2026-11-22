/**
 * China Pages notice points at Workers; legacy install stubs redirect.
 *
 *   npx tsx --test tests/china-setup-guide-parity.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const repo = process.cwd();

test("china notice exposes Workers entry CTAs", () => {
  const zh = readFileSync(path.join(repo, "china-pages/index.html"), "utf8");
  const en = readFileSync(path.join(repo, "china-pages/en.html"), "utf8");
  assert.match(zh, /data-testid="china-workers-entry"/);
  assert.match(zh, /workers\.dev\/zh-Hans/);
  assert.match(en, /data-testid="china-workers-entry"/);
  assert.match(en, /workers\.dev\/en/);
  assert.match(en, /data-testid="china-workers-zh-hans"/);
});

test("CHINA_GITHUB_PAGES documents notice-only China entry", () => {
  const docs = readFileSync(path.join(repo, "docs/CHINA_GITHUB_PAGES.md"), "utf8");
  assert.match(docs, /告知书/);
  assert.match(docs, /region-redirect\.js/);
  assert.match(docs, /全站/);
});

test("legacy install/privacy stubs bounce to notice", () => {
  assert.match(
    readFileSync(path.join(repo, "china-pages/install.html"), "utf8"),
    /index\.html/
  );
  assert.match(
    readFileSync(path.join(repo, "china-pages/install-en.html"), "utf8"),
    /en\.html/
  );
  assert.match(
    readFileSync(path.join(repo, "china-pages/privacy.html"), "utf8"),
    /index\.html/
  );
  assert.match(
    readFileSync(path.join(repo, "china-pages/privacy-en.html"), "utf8"),
    /en\.html/
  );
});
