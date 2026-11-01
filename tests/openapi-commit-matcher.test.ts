import test from "node:test";
import assert from "node:assert/strict";
import {
  isOpenApiCommitCommand,
  openApiOutOfSyncAllowPayload,
  stagedIncludesOpenApiPaths
} from "../scripts/openapi-commit-matcher.mjs";

test("isOpenApiCommitCommand matches git commit / -m / husky / npm wrappers", () => {
  assert.equal(isOpenApiCommitCommand("git commit -m 'msg'"), true);
  assert.equal(isOpenApiCommitCommand("git -c user.name=x commit"), true);
  assert.equal(isOpenApiCommitCommand("npx husky"), true);
  assert.equal(isOpenApiCommitCommand(".husky/pre-commit"), true);
  assert.equal(isOpenApiCommitCommand("npm exec commit"), true);
  assert.equal(isOpenApiCommitCommand("npm run test"), false);
  assert.equal(isOpenApiCommitCommand("git status"), false);
});

test("stagedIncludesOpenApiPaths detects timing OpenAPI/schema files", () => {
  assert.equal(
    stagedIncludesOpenApiPaths("docs/openapi-check-timing.yaml\nREADME.md"),
    true
  );
  assert.equal(stagedIncludesOpenApiPaths("extension/shared/check-timing.schema.json"), true);
  assert.equal(stagedIncludesOpenApiPaths("app/page.tsx"), false);
});

test("openApiOutOfSyncAllowPayload soft-allow includes npm run openapi:sync", () => {
  const payload = openApiOutOfSyncAllowPayload();
  assert.equal(payload.permission, "allow");
  assert.match(payload.user_message, /npm run openapi:sync/);
  assert.match(payload.agent_message, /npm run openapi:sync/);
  assert.match(payload.agent_message, /re-stage/);
});