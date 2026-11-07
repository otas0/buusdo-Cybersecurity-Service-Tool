#!/usr/bin/env bash
# Soft gate on every git commit: OpenAPI / schema copies must stay in sync.
set -euo pipefail
INPUT=$(cat || true)
# Cursor project hooks run with workspace root as cwd.
MATCH=$(node --input-type=module -e '
import { isOpenApiCommitCommand } from "./scripts/openapi-commit-matcher.mjs";
process.stdout.write(isOpenApiCommitCommand(process.argv[1]) ? "1" : "0");
' "$INPUT")

if [ "$MATCH" != "1" ]; then
  printf '%s\n' '{"permission":"allow"}'
  exit 0
fi

# Daily: always run openapi:check on commit (not only when OpenAPI paths are staged).
if ! npm run openapi:check >/dev/null 2>&1; then
  MSG='OpenAPI/schema copies out of sync. Run: npm run openapi:sync'
  echo "$MSG" >&2
  node --input-type=module -e '
import { openApiOutOfSyncAllowPayload } from "./scripts/openapi-commit-matcher.mjs";
process.stdout.write(JSON.stringify(openApiOutOfSyncAllowPayload(process.argv[1])));
' "$MSG"
  exit 0
fi
printf '%s\n' '{"permission":"allow"}'
