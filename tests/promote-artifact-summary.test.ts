/**
 * Promote job summary: empty ARTIFACT_URL still prints ARTIFACT_ID= before gh api zip tip;
 * both-empty path still prints a stub ARTIFACT_ID= comment.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

/** Mirrors .github/workflows/desktop-promote-macos-url.yml empty-URL branch. */
const SNIPPET_WITH_ID = `
set -euo pipefail
ARTIFACT_URL=""
ARTIFACT_ID="4242"
ARTIFACT_NAME="desktop-downloads-promote-diff-pr-7"
REPO="otas0/preventive-cybersecurity-prototype"
{
  echo "### Promote diff artifact"
  echo ""
  echo "- Name: \\\`$ARTIFACT_NAME\\\`"
  if [ -n "\${ARTIFACT_URL:-}" ]; then
    echo "- Download: $ARTIFACT_URL"
  fi
  if [ -n "\${ARTIFACT_ID:-}" ]; then
    echo "- Artifact id: \\\`$ARTIFACT_ID\\\` — run artifacts"
    if [ -z "\${ARTIFACT_URL:-}" ]; then
      echo "ARTIFACT_ID=$ARTIFACT_ID"
      echo "- Copy-paste download hint:"
      echo "\\\`\\\`\\\`"
      echo "gh api repos/$REPO/actions/artifacts/$ARTIFACT_ID/zip > \${ARTIFACT_NAME}.zip"
      echo "\\\`\\\`\\\`"
    fi
  fi
  if [ -z "\${ARTIFACT_URL:-}" ] && [ -z "\${ARTIFACT_ID:-}" ]; then
    echo "# ARTIFACT_ID=  (empty — Actions did not expose artifact-url or artifact-id)"
    echo "- Run artifacts (open \\\`$ARTIFACT_NAME\\\`)"
  fi
}
`;

const SNIPPET_BOTH_EMPTY = `
set -euo pipefail
ARTIFACT_URL=""
ARTIFACT_ID=""
ARTIFACT_NAME="desktop-downloads-promote-diff-pr-7"
{
  echo "### Promote diff artifact"
  echo ""
  echo "- Name: \\\`$ARTIFACT_NAME\\\`"
  if [ -n "\${ARTIFACT_URL:-}" ]; then
    echo "- Download: $ARTIFACT_URL"
  fi
  if [ -n "\${ARTIFACT_ID:-}" ]; then
    echo "ARTIFACT_ID=$ARTIFACT_ID"
  fi
  if [ -z "\${ARTIFACT_URL:-}" ] && [ -z "\${ARTIFACT_ID:-}" ]; then
    echo "# ARTIFACT_ID=  (empty — Actions did not expose artifact-url or artifact-id)"
    echo "- Run artifacts (open \\\`$ARTIFACT_NAME\\\`)"
  fi
}
`;

test("empty ARTIFACT_URL echoes ARTIFACT_ID= before gh api zip tip", () => {
  const result = spawnSync("bash", ["-c", SNIPPET_WITH_ID], { encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const out = result.stdout;
  const idLine = out.indexOf("ARTIFACT_ID=4242");
  const apiLine = out.indexOf("gh api repos/");
  assert.ok(idLine >= 0, `missing ARTIFACT_ID= line:\n${out}`);
  assert.ok(apiLine > idLine, `gh api must follow ARTIFACT_ID=:\n${out}`);
  assert.match(
    out,
    /gh api repos\/otas0\/preventive-cybersecurity-prototype\/actions\/artifacts\/4242\/zip/
  );
});

test("both URL and id empty still prints stub ARTIFACT_ID= comment", () => {
  const result = spawnSync("bash", ["-c", SNIPPET_BOTH_EMPTY], { encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /# ARTIFACT_ID=\s+\(empty/);
});

test("promote YAML documents stub ARTIFACT_ID= when both empty", () => {
  const yml = readFileSync(
    path.resolve(".github/workflows/desktop-promote-macos-url.yml"),
    "utf8"
  );
  assert.match(yml, /# ARTIFACT_ID=\s+\(empty — Actions did not expose artifact-url or artifact-id\)/);
});