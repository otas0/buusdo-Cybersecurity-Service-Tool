/**
 * Integration: CONNECT refuse for a personal-list host returns Kind user-block.
 * Uses desktop-app proxy + threats overlay against a temp SHIELD_LISTS_PATH.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("CONNECT refuse for personal host returns Kind user-block", async () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-lists-"));
  const listsFile = join(dir, "shield-backup.json");
  const host = "personal-block.connect.test";
  writeFileSync(
    listsFile,
    JSON.stringify({
      schema: "shield-lists-v1",
      updatedAt: "2026-10-25T12:00:00.000Z",
      blocked: [{ domain: host, reason: "user" }],
      trusted: []
    }),
    "utf8"
  );
  process.env.SHIELD_LISTS_PATH = listsFile;

  // Fresh CJS loads so listsPath() sees SHIELD_LISTS_PATH.
  for (const rel of [
    "desktop-app/src/lists-store.js",
    "desktop-app/src/threats.js",
    "desktop-app/src/proxy-server.js",
    "desktop-app/src/state.js"
  ]) {
    try {
      delete require.cache[require.resolve(join(root, rel))];
    } catch {
      /* not yet loaded */
    }
  }

  const threats = require(join(root, "desktop-app/src/threats.js")) as {
    loadDetector: () => Promise<void>;
    classifyUrl: (u: string) => { kind: string | null };
  };
  await threats.loadDetector();
  assert.equal(threats.classifyUrl(`https://${host}/`).kind, "user-block");

  const { handleConnect } = require(join(root, "desktop-app/src/proxy-server.js")) as {
    handleConnect: (
      req: { url?: string },
      socket: { write: (s: string) => void; end: () => void },
      head?: Buffer
    ) => void;
  };

  let written = "";
  const socket = {
    write(chunk: string) {
      written += chunk;
    },
    end() {
      /* closed */
    }
  };
  handleConnect({ url: `${host}:443` }, socket, Buffer.alloc(0));

  assert.match(written, /HTTP\/1\.1 403 Forbidden/);
  assert.match(written, /X-Preventive-Shield: blocked/i);
  assert.match(written, /X-Preventive-Shield-Kind:\s*user-block/i);
  delete process.env.SHIELD_LISTS_PATH;
});

test("HTTP 403 for personal host returns Kind user-block", async () => {
  const dir = mkdtempSync(join(tmpdir(), "shield-lists-http-"));
  const listsFile = join(dir, "shield-backup.json");
  const host = "personal-block.http.test";
  writeFileSync(
    listsFile,
    JSON.stringify({
      schema: "shield-lists-v1",
      updatedAt: "2026-10-25T12:00:00.000Z",
      blocked: [{ domain: host, reason: "user" }],
      trusted: []
    }),
    "utf8"
  );
  process.env.SHIELD_LISTS_PATH = listsFile;

  for (const rel of [
    "desktop-app/src/lists-store.js",
    "desktop-app/src/threats.js",
    "desktop-app/src/proxy-server.js",
    "desktop-app/src/state.js"
  ]) {
    try {
      delete require.cache[require.resolve(join(root, rel))];
    } catch {
      /* not yet loaded */
    }
  }

  const threats = require(join(root, "desktop-app/src/threats.js")) as {
    loadDetector: () => Promise<void>;
  };
  await threats.loadDetector();

  const { handleHttpProxy } = require(join(root, "desktop-app/src/proxy-server.js")) as {
    handleHttpProxy: (
      req: { url?: string; method?: string; headers?: Record<string, string> },
      res: {
        headersSent: boolean;
        writeHead: (code: number, h: Record<string, string | number>) => void;
        end: (b?: string) => void;
      }
    ) => void;
  };

  const headers: Record<string, string | number> = {};
  let status = 0;
  let body = "";
  const res = {
    headersSent: false,
    writeHead(code: number, h: Record<string, string | number>) {
      status = code;
      Object.assign(headers, h);
      this.headersSent = true;
    },
    end(b?: string) {
      body = b || "";
    }
  };

  handleHttpProxy({ url: `http://${host}/`, method: "GET", headers: {} }, res);

  assert.equal(status, 403);
  assert.equal(headers["X-Preventive-Shield"], "blocked");
  assert.equal(headers["X-Preventive-Shield-Kind"], "user-block");
  assert.match(body, /user-block|blocked/i);
  delete process.env.SHIELD_LISTS_PATH;
});