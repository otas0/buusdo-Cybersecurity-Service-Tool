import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("desktop server skips POST /api/log/clear-ring (UI-only Clear ring)", () => {
  const server = readFileSync(join(process.cwd(), "desktop-app/src/server.js"), "utf8");
  assert.equal(/\/api\/log\/clear-ring/.test(server.replace(/\/\/[^\n]*/g, "")), false);
  assert.match(server, /Intentionally no POST \/api\/log\/clear-ring/);
  const state = readFileSync(join(process.cwd(), "desktop-app/src/state.js"), "utf8");
  assert.match(state, /client-side only/);
  const readme = readFileSync(join(process.cwd(), "desktop-app/README.md"), "utf8");
  assert.match(readme, /Operator FAQ/);
  assert.match(readme, /Does Clear ring fan out over SSE/);
  assert.match(readme, /no `POST \/api\/log\/clear-ring`/);
});