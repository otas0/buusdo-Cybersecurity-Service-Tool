# Cursor project hooks

Committed on purpose: soft OpenAPI/schema sync gate on `git commit`.

- `hooks.json` → `beforeShellExecution` matcher for commit commands
- `openapi-check.sh` → runs `npm run openapi:check`; on drift **allows** the commit but surfaces `npm run openapi:sync`

Does not block commits hard (CI still fails on drift). Keep executable bit on `openapi-check.sh`.
