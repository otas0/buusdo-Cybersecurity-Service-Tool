/**
 * revealPathInShell — darwin open -R / linux xdg-open with mocked spawnSync.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { revealPathInShell } = require("../desktop-app/src/reveal-path.js");

test("darwin uses open -R and returns via open-R", async () => {
  const calls: { cmd: string; args: string[] }[] = [];
  const result = await revealPathInShell("/tmp/diag.json", {
    platform: "darwin",
    electronShell: null,
    spawnSync: (cmd: string, args: string[]) => {
      calls.push({ cmd, args });
      return { status: 0, stdout: "", stderr: "" };
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.via, "open-R");
  assert.deepEqual(calls, [{ cmd: "open", args: ["-R", "/tmp/diag.json"] }]);
});

test("linux uses xdg-open on parent dir", async () => {
  const calls: { cmd: string; args: string[] }[] = [];
  const result = await revealPathInShell("/var/data/diag.json", {
    platform: "linux",
    electronShell: null,
    spawnSync: (cmd: string, args: string[]) => {
      calls.push({ cmd, args });
      return { status: 0, stdout: "", stderr: "" };
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.via, "xdg-open");
  assert.deepEqual(calls, [{ cmd: "xdg-open", args: ["/var/data"] }]);
});

test("linux xdg-open missing → deferred", async () => {
  const result = await revealPathInShell("/var/data/diag.json", {
    platform: "linux",
    electronShell: null,
    spawnSync: () => ({
      status: 127,
      error: Object.assign(new Error("spawn xdg-open ENOENT"), { code: "ENOENT" }),
      stdout: "",
      stderr: ""
    })
  });
  assert.equal(result.ok, false);
  assert.equal(result.deferred, true);
});

test("electron shell preferred when openPath succeeds", async () => {
  const result = await revealPathInShell("/tmp/x.json", {
    platform: "darwin",
    electronShell: {
      openPath: async () => ""
    },
    spawnSync: () => {
      throw new Error("spawnSync must not run when electron works");
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.via, "electron");
});

test("win32 uses explorer /select,", async () => {
  const calls: { cmd: string; args: string[] }[] = [];
  const file = "C:\\\\Users\\\\a\\\\diag.json";
  const result = await revealPathInShell(file, {
    platform: "win32",
    electronShell: null,
    spawnSync: (cmd: string, args: string[]) => {
      calls.push({ cmd, args });
      return { status: 1, stdout: "", stderr: "" }; // explorer often non-zero
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.via, "explorer-select");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cmd, "explorer");
  assert.equal(calls[0].args[0], `/select,${file}`);
});