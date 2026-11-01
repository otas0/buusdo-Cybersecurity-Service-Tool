import {
  type AccountClient,
  type AccountSession,
  type AccountUser,
  deleteUserCascade,
  getListBackup,
  normalizeEmail,
  readOnlyStore,
  readOnlyStoreAsync,
  upsertUser,
  withStore
} from "./store";
import { hashToken, randomToken } from "./crypto";

const MAGIC_TTL_MS = 15 * 60_000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;
const DEVICE_CODE_TTL_MS = 5 * 60_000;

export const SESSION_COOKIE = "shield_account_session";

function pruneExpired(store: {
  magics: { expiresAt: string }[];
  sessions: { expiresAt: string }[];
  deviceCodes: { expiresAt: string }[];
}): void {
  const now = Date.now();
  store.magics = store.magics.filter((m) => new Date(m.expiresAt).getTime() > now) as typeof store.magics;
  store.sessions = store.sessions.filter(
    (s) => new Date(s.expiresAt).getTime() > now
  ) as typeof store.sessions;
  store.deviceCodes = store.deviceCodes.filter(
    (d) => new Date(d.expiresAt).getTime() > now
  ) as typeof store.deviceCodes;
}

export function createMagicChallenge(
  email: string,
  client: AccountClient
): { token: string; expiresAt: string } {
  const token = randomToken(32);
  const now = Date.now();
  const expiresAt = new Date(now + MAGIC_TTL_MS).toISOString();
  withStore((store) => {
    pruneExpired(store);
    store.magics.push({
      tokenHash: hashToken(token),
      email: normalizeEmail(email),
      client,
      expiresAt,
      createdAt: new Date().toISOString()
    });
  });
  return { token, expiresAt };
}

export type ConsumeMagicResult =
  | { ok: true; user: AccountUser; sessionToken: string; client: AccountClient; deviceCode?: string }
  | { ok: false; error: string };

export function consumeMagicToken(token: string): ConsumeMagicResult {
  if (!token) return { ok: false, error: "token-required" };
  return withStore((store) => {
    pruneExpired(store);
    const hash = hashToken(token);
    const idx = store.magics.findIndex((m) => m.tokenHash === hash);
    if (idx < 0) return { ok: false, error: "invalid-or-expired-token" };
    const magic = store.magics[idx]!;
    store.magics.splice(idx, 1);
    const user = upsertUser(store, magic.email);
    const sessionToken = randomToken(32);
    const session: AccountSession = {
      id: `s_${Date.now().toString(36)}`,
      userId: user.id,
      tokenHash: hashToken(sessionToken),
      kind: magic.client === "web" ? "cookie" : "bearer",
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      createdAt: new Date().toISOString()
    };
    store.sessions.push(session);

    if (magic.client === "web") {
      return { ok: true, user, sessionToken, client: magic.client };
    }

    const deviceCode = randomToken(16);
    store.deviceCodes.push({
      codeHash: hashToken(deviceCode),
      userId: user.id,
      expiresAt: new Date(Date.now() + DEVICE_CODE_TTL_MS).toISOString(),
      createdAt: new Date().toISOString()
    });
    return { ok: true, user, sessionToken, client: magic.client, deviceCode };
  });
}

export function exchangeDeviceCode(
  deviceCode: string
): { ok: true; accessToken: string; refreshToken: string; expiresAt: string } | { ok: false; error: string } {
  if (!deviceCode) return { ok: false, error: "deviceCode-required" };
  return withStore((store) => {
    pruneExpired(store);
    const hash = hashToken(deviceCode);
    const idx = store.deviceCodes.findIndex((d) => d.codeHash === hash);
    if (idx < 0) return { ok: false, error: "invalid-or-expired-device-code" };
    const row = store.deviceCodes[idx]!;
    store.deviceCodes.splice(idx, 1);
    const accessToken = randomToken(32);
    const refreshToken = randomToken(32);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    store.sessions.push({
      id: `s_${Date.now().toString(36)}`,
      userId: row.userId,
      tokenHash: hashToken(accessToken),
      kind: "bearer",
      expiresAt,
      createdAt: new Date().toISOString()
    });
    store.sessions.push({
      id: `r_${Date.now().toString(36)}`,
      userId: row.userId,
      tokenHash: hashToken(refreshToken),
      kind: "refresh",
      expiresAt: new Date(Date.now() + SESSION_TTL_MS * 2).toISOString(),
      createdAt: new Date().toISOString()
    });
    return { ok: true, accessToken, refreshToken, expiresAt };
  });
}

/**
 * Rotate access (+ refresh) from a refresh token. Old refresh is revoked.
 */
export function refreshAccessToken(
  refreshToken: string
):
  | { ok: true; accessToken: string; refreshToken: string; expiresAt: string }
  | { ok: false; error: string } {
  if (!refreshToken) return { ok: false, error: "refreshToken-required" };
  return withStore((store) => {
    pruneExpired(store);
    const hash = hashToken(refreshToken);
    const idx = store.sessions.findIndex(
      (s) => s.tokenHash === hash && (s.kind === "refresh" || s.kind === "bearer")
    );
    if (idx < 0) return { ok: false, error: "invalid-or-expired-refresh" };
    const row = store.sessions[idx]!;
    // Prefer explicit refresh kind; allow legacy bearer refresh rows from v1 exchange.
    if (row.kind !== "refresh" && !row.id.startsWith("r_")) {
      return { ok: false, error: "invalid-or-expired-refresh" };
    }
    store.sessions.splice(idx, 1);
    const accessToken = randomToken(32);
    const nextRefresh = randomToken(32);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    store.sessions.push({
      id: `s_${Date.now().toString(36)}`,
      userId: row.userId,
      tokenHash: hashToken(accessToken),
      kind: "bearer",
      expiresAt,
      createdAt: new Date().toISOString()
    });
    store.sessions.push({
      id: `r_${Date.now().toString(36)}`,
      userId: row.userId,
      tokenHash: hashToken(nextRefresh),
      kind: "refresh",
      expiresAt: new Date(Date.now() + SESSION_TTL_MS * 2).toISOString(),
      createdAt: new Date().toISOString()
    });
    return { ok: true, accessToken, refreshToken: nextRefresh, expiresAt };
  });
}

export function resolveSession(
  token: string | null | undefined
): { user: AccountUser; session: AccountSession } | null {
  if (!token) return null;
  const store = readOnlyStore();
  const now = Date.now();
  const hash = hashToken(token);
  const session = store.sessions.find(
    (s) =>
      s.tokenHash === hash &&
      new Date(s.expiresAt).getTime() > now &&
      s.kind !== "refresh"
  );
  if (!session) return null;
  const user = store.users.find((u) => u.id === session.userId);
  if (!user) return null;
  return { user, session };
}

export async function resolveSessionAsync(
  token: string | null | undefined
): Promise<{ user: AccountUser; session: AccountSession } | null> {
  if (!token) return null;
  const store = await readOnlyStoreAsync();
  const now = Date.now();
  const hash = hashToken(token);
  const session = store.sessions.find(
    (s) =>
      s.tokenHash === hash &&
      new Date(s.expiresAt).getTime() > now &&
      s.kind !== "refresh"
  );
  if (!session) return null;
  const user = store.users.find((u) => u.id === session.userId);
  if (!user) return null;
  return { user, session };
}

export function revokeSessionToken(token: string): void {
  const hash = hashToken(token);
  withStore((store) => {
    store.sessions = store.sessions.filter((s) => s.tokenHash !== hash);
  });
}

export function deleteAccountForUser(userId: string): void {
  withStore((store) => deleteUserCascade(store, userId));
}

export function parseBearer(request: Request): string | null {
  const h = request.headers.get("authorization") || "";
  const m = /^Bearer\s+(\S+)/i.exec(h);
  return m?.[1] ?? null;
}

export function parseCookieToken(request: Request): string | null {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === SESSION_COOKIE) return decodeURIComponent(rest.join("=") || "");
  }
  return null;
}

export function sessionFromRequest(request: Request) {
  return resolveSession(parseBearer(request) || parseCookieToken(request));
}

export async function sessionFromRequestAsync(request: Request) {
  return resolveSessionAsync(parseBearer(request) || parseCookieToken(request));
}

export function sessionCookieHeader(token: string, maxAgeSec = SESSION_TTL_MS / 1000): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAgeSec)}${secure}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** Export account metadata + lists only (GDPR). */
export function exportAccountData(userId: string): {
  email: string;
  userId: string;
  createdAt: string;
  lists: unknown | null;
  listsUpdatedAt: string | null;
} | null {
  const store = readOnlyStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return null;
  const lists = getListBackup(store, userId);
  return {
    email: user.email,
    userId: user.id,
    createdAt: user.createdAt,
    lists: lists.backup,
    listsUpdatedAt: lists.updatedAt
  };
}

export async function exportAccountDataAsync(userId: string) {
  const store = await readOnlyStoreAsync();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return null;
  const lists = getListBackup(store, userId);
  return {
    email: user.email,
    userId: user.id,
    createdAt: user.createdAt,
    lists: lists.backup,
    listsUpdatedAt: lists.updatedAt
  };
}