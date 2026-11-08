/**
 * Guard: default `npm test` must pick up Europe FAQ question-form coverage.
 *
 *   npx tsx --test tests/npm-test-includes-eu-faq.test.ts
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

test("package.json test script covers eu-faq-question-form via tests/*.test.ts", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts?: { test?: string };
  };
  const testScript = pkg.scripts?.test ?? "";
  assert.match(
    testScript,
    /tests\/\*\.test\.ts/,
    "npm test must glob tests/*.test.ts so eu-faq-question-form is included"
  );
  assert.ok(
    existsSync("tests/eu-faq-question-form.test.ts"),
    "tests/eu-faq-question-form.test.ts must exist on the default npm test path"
  );
  // Fail loudly if someone narrows npm test to an explicit file list that omits eu-faq.
  if (!testScript.includes("tests/*.test.ts") && !testScript.includes("eu-faq-question-form")) {
    assert.fail("eu-faq-question-form is not on the default npm test path");
  }
});
