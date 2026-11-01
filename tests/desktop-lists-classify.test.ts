import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

test("CONNECT-style https://blocked.host/ classifies as user-block after lists-store write", async () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-lists-"));
  const file = join(dir, "shield-backup.json");
  process.env.SHIELD_LISTS_PATH = file;

  try {
    // Fresh module instance so peekCache/path pick up SHIELD_LISTS_PATH
    const listsHref = pathToFileURL(
      join(process.cwd(), "desktop-app/src/lists-store.js")
    ).href;
    const threatsHref = pathToFileURL(join(process.cwd(), "desktop-app/src/threats.js")).href;

    // CommonJS via createRequire so we share one cache after env is set
    delete require.cache[require.resolve("../desktop-app/src/lists-store.js")];
    delete require.cache[require.resolve("../desktop-app/src/threats.js")];

    const listsStore = require("../desktop-app/src/lists-store.js");
    const threats = require("../desktop-app/src/threats.js");

    await threats.loadDetector();
    const mod = await listsStore.loadMod();
    await listsStore.writeLists(mod.addBlocked(mod.emptyLists(), "blocked.host"));

    const result = threats.classifyUrl("https://blocked.host/");
    assert.equal(result.kind, "user-block");
    assert.equal(result.reason, "user-block");
    assert.equal(result.host, "blocked.host");

    void listsHref;
    void threatsHref;
  } finally {
    delete process.env.SHIELD_LISTS_PATH;
    delete require.cache[require.resolve("../desktop-app/src/lists-store.js")];
    delete require.cache[require.resolve("../desktop-app/src/threats.js")];
    rmSync(dir, { recursive: true, force: true });
  }
});

test("personal trust overrides curated phishing brand host (desktop classify)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-lists-trust-"));
  const file = join(dir, "shield-backup.json");
  process.env.SHIELD_LISTS_PATH = file;
  const host = "paypal.secure-login.example";

  try {
    delete require.cache[require.resolve("../desktop-app/src/lists-store.js")];
    delete require.cache[require.resolve("../desktop-app/src/threats.js")];

    const listsStore = require("../desktop-app/src/lists-store.js");
    const threats = require("../desktop-app/src/threats.js");

    await threats.loadDetector();
    assert.equal(threats.classifyUrl(`https://${host}/`).kind, "phishing");

    const mod = await listsStore.loadMod();
    await listsStore.writeLists(mod.addTrusted(mod.emptyLists(), host));

    const cleared = threats.classifyUrl(`https://${host}/`);
    assert.equal(cleared.kind, null);
    assert.equal(cleared.host, host);
  } finally {
    delete process.env.SHIELD_LISTS_PATH;
    delete require.cache[require.resolve("../desktop-app/src/lists-store.js")];
    delete require.cache[require.resolve("../desktop-app/src/threats.js")];
    rmSync(dir, { recursive: true, force: true });
  }
});