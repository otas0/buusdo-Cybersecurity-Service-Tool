/**
 * Shared matcher for .cursor/hooks/openapi-check.sh (unit-tested).
 * @param {string} input
 */
export function isOpenApiCommitCommand(input) {
  const s = String(input || "");
  return /git.*[\s]commit|commit[\s]+-m|\.husky\/|husky|npm[\s]+(exec|run).*commit|npx[\s].*commit/i.test(
    s
  );
}

export function stagedIncludesOpenApiPaths(stagedNames) {
  const text = Array.isArray(stagedNames) ? stagedNames.join("\n") : String(stagedNames || "");
  return /(^|\/)(openapi-check-timing\.yaml|check-timing\.schema\.json)$/m.test(text);
}

/** Soft-allow payload when OpenAPI copies drift (hook stdout). */
export function openApiOutOfSyncAllowPayload(
  msg = "OpenAPI/schema copies out of sync. Run: npm run openapi:sync"
) {
  return {
    permission: "allow",
    user_message: msg,
    agent_message: `${msg} — then re-stage and commit.`
  };
}