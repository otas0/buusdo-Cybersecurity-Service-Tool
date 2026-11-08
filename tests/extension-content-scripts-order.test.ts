import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("manifest loads phishing-toast-mount.js before content.js", () => {
  const manifest = JSON.parse(
    readFileSync(join(process.cwd(), "extension/manifest.json"), "utf8")
  ) as { content_scripts?: Array<{ js?: string[] }> };
  const scripts = manifest.content_scripts?.flatMap((c) => c.js || []) || [];
  const mount = scripts.indexOf("content/phishing-toast-mount.js");
  const content = scripts.indexOf("content/content.js");
  assert.ok(mount >= 0, "phishing-toast-mount.js listed");
  assert.ok(content >= 0, "content.js listed");
  assert.ok(mount < content, "mount must precede content.js so resolveToastLang is ready");
});
