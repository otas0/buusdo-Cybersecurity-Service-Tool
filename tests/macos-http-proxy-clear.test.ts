import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { clearHttpProxy } = require("../desktop-app/src/macos-http-proxy.js") as {
  clearHttpProxy: (
    opts?: { service?: string },
    deps?: {
      platform?: string;
      run?: (cmd: string, args: string[], timeout?: number) => Promise<{
        ok: boolean;
        code: number;
        stdout: string;
        stderr: string;
        error: string | null;
      }>;
    }
  ) => Promise<{ ok: boolean; applied: boolean; method?: string; service?: string; error?: string }>;
};

test("clearHttpProxy mocks networksetup success path", async () => {
  const calls: Array<{ cmd: string; args: string[] }> = [];
  const run = async (cmd: string, args: string[]) => {
    calls.push({ cmd, args });
    if (cmd === "networksetup" && args[0] === "-listallnetworkservices") {
      return { ok: true, code: 0, stdout: "Wi-Fi\nThunderbolt Bridge", stderr: "", error: null };
    }
    if (cmd === "networksetup" && args[0] === "-setwebproxystate") {
      assert.deepEqual(args, ["-setwebproxystate", "Wi-Fi", "off"]);
      return { ok: true, code: 0, stdout: "", stderr: "", error: null };
    }
    if (cmd === "networksetup" && args[0] === "-setsecurewebproxystate") {
      assert.deepEqual(args, ["-setsecurewebproxystate", "Wi-Fi", "off"]);
      return { ok: true, code: 0, stdout: "", stderr: "", error: null };
    }
    return { ok: false, code: 1, stdout: "", stderr: "unexpected", error: "unexpected" };
  };
  const result = await clearHttpProxy({}, { platform: "darwin", run });
  assert.equal(result.ok, true);
  assert.equal(result.applied, true);
  assert.equal(result.method, "networksetup");
  assert.equal(result.service, "Wi-Fi");
  assert.ok(calls.some((c) => c.args[0] === "-setwebproxystate"));
  assert.ok(calls.some((c) => c.args[0] === "-setsecurewebproxystate"));
});

test("clearHttpProxy non-darwin → macos-only", async () => {
  const result = await clearHttpProxy({}, { platform: "linux", run: async () => {
    throw new Error("should-not-run");
  }});
  assert.equal(result.ok, false);
  assert.equal(result.error, "macos-only");
});