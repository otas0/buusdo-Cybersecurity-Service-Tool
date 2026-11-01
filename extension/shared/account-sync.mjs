/**
 * Extension account sync helpers (Bearer against first-party website).
 * Tokens only when privacy ≠ off.
 */

export const ACCOUNT_ACCESS_KEY = "shieldAccountAccessToken";
export const ACCOUNT_REFRESH_KEY = "shieldAccountRefreshToken";
export const ACCOUNT_EMAIL_KEY = "shieldAccountEmail";
export const ACCOUNT_SYNC_KEY = "shieldAccountSyncEnabled";

export const ACCOUNT_TOKEN_KEYS = [
  ACCOUNT_ACCESS_KEY,
  ACCOUNT_REFRESH_KEY,
  ACCOUNT_EMAIL_KEY,
  ACCOUNT_SYNC_KEY
];

/**
 * @param {string} base
 * @param {string} path
 * @param {RequestInit & { token?: string }} [opts]
 */
export async function accountFetch(base, path, opts = {}) {
  const url = `${String(base).replace(/\/$/, "")}${path}`;
  const headers = new Headers(opts.headers || {});
  if (!headers.has("Content-Type") && opts.body) {
    headers.set("Content-Type", "application/json");
  }
  if (opts.token) headers.set("Authorization", `Bearer ${opts.token}`);
  const { token: _t, ...rest } = opts;
  return fetch(url, { ...rest, headers });
}

/**
 * @param {{ accessToken?: string, refreshToken?: string, email?: string, syncEnabled?: boolean }} tokens
 * @param {{ set: (o: Record<string, unknown>) => Promise<void>, remove: (k: string[]) => Promise<void> }} storage
 */
export async function persistAccountTokens(tokens, storage) {
  const patch = {};
  if (tokens.accessToken) patch[ACCOUNT_ACCESS_KEY] = tokens.accessToken;
  if (tokens.refreshToken) patch[ACCOUNT_REFRESH_KEY] = tokens.refreshToken;
  if (tokens.email) patch[ACCOUNT_EMAIL_KEY] = tokens.email;
  if (typeof tokens.syncEnabled === "boolean") {
    patch[ACCOUNT_SYNC_KEY] = tokens.syncEnabled ? true : false;
  }
  if (Object.keys(patch).length) await storage.set(patch);
}

export async function clearAccountTokens(storage) {
  await storage.remove(ACCOUNT_TOKEN_KEYS);
}

/**
 * @param {{ get: (k: string | string[]) => Promise<Record<string, unknown>> }} storage
 */
export async function readAccountTokens(storage) {
  const data = await storage.get(ACCOUNT_TOKEN_KEYS);
  return {
    accessToken: typeof data[ACCOUNT_ACCESS_KEY] === "string" ? data[ACCOUNT_ACCESS_KEY] : "",
    refreshToken: typeof data[ACCOUNT_REFRESH_KEY] === "string" ? data[ACCOUNT_REFRESH_KEY] : "",
    email: typeof data[ACCOUNT_EMAIL_KEY] === "string" ? data[ACCOUNT_EMAIL_KEY] : "",
    syncEnabled: data[ACCOUNT_SYNC_KEY] === true
  };
}