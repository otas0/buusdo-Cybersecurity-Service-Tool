/**
 * Persist account Bearer tokens beside desktop data/ (gitignored).
 */
const fs = require("fs");
const path = require("path");

function tokensPath() {
  return (
    process.env.ACCOUNT_TOKENS_PATH ||
    path.join(__dirname, "..", "data", "account-tokens.json")
  );
}

function empty() {
  return {
    accessToken: "",
    refreshToken: "",
    email: "",
    syncEnabled: false,
    expiresAt: null,
    lastSyncError: null,
    lastSyncErrorAt: null
  };
}

function readTokens() {
  try {
    const raw = JSON.parse(fs.readFileSync(tokensPath(), "utf8"));
    return {
      accessToken: typeof raw.accessToken === "string" ? raw.accessToken : "",
      refreshToken: typeof raw.refreshToken === "string" ? raw.refreshToken : "",
      email: typeof raw.email === "string" ? raw.email : "",
      syncEnabled: raw.syncEnabled === true,
      expiresAt: typeof raw.expiresAt === "string" ? raw.expiresAt : null,
      lastSyncError: typeof raw.lastSyncError === "string" ? raw.lastSyncError : null,
      lastSyncErrorAt: typeof raw.lastSyncErrorAt === "string" ? raw.lastSyncErrorAt : null
    };
  } catch {
    return empty();
  }
}

function setLastSyncError(message) {
  if (!message) {
    return writeTokens({ lastSyncError: null, lastSyncErrorAt: null });
  }
  return writeTokens({
    lastSyncError: String(message).slice(0, 200),
    lastSyncErrorAt: new Date().toISOString()
  });
}

function writeTokens(patch) {
  const next = { ...readTokens(), ...patch };
  const dir = path.dirname(tokensPath());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(tokensPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

function clearTokens() {
  writeTokens(empty());
  return empty();
}

module.exports = {
  tokensPath,
  readTokens,
  writeTokens,
  clearTokens,
  setLastSyncError
};