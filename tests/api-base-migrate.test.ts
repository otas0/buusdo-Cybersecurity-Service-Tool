import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_API_BASE,
  migrateLegacyApiBase
} from "../extension/shared/api-base-migrate.mjs";

test("migrateLegacyApiBase maps :3001 defaults to localhost:3000", () => {
  assert.equal(migrateLegacyApiBase("http://127.0.0.1:3001"), DEFAULT_API_BASE);
  assert.equal(migrateLegacyApiBase("http://localhost:3001/"), DEFAULT_API_BASE);
  assert.equal(migrateLegacyApiBase("http://localhost:3000"), "http://localhost:3000");
  assert.equal(migrateLegacyApiBase(""), DEFAULT_API_BASE);
});