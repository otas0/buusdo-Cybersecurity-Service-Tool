/**
 * Account sync store — file by default; Turso/libsql when DATABASE_URL is set.
 * Sync helpers remain for tests; prefer withStoreAsync / readOnlyStoreAsync in routes.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { decryptAtRest, encryptAtRest } from "./crypto";
import { isSqlStoreConfigured, readStoreSql, writeStoreSql } from "./store-sql";
import {
  type AccountUser,
  type StoreFile,
  EMPTY_STORE
} from "./store-types";

export type {
  AccountClient,
  AccountSession,
  AccountUser,
  DeviceCode,
  MagicChallenge,
  StoreFile
} from "./store-types";

function storePath(): string {
  return (
    process.env.ACCOUNT_SYNC_STORE_PATH ||
    join(process.cwd(), "data", "account-sync", "store.json")
  );
}

function readStoreFile(): StoreFile {
  const path = storePath();
  try {
    if (!existsSync(path)) return structuredClone(EMPTY_STORE);
    const raw = JSON.parse(readFileSync(path, "utf8")) as StoreFile;
    return {
      users: Array.isArray(raw.users) ? raw.users : [],
      sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
      magics: Array.isArray(raw.magics) ? raw.magics : [],
      deviceCodes: Array.isArray(raw.deviceCodes) ? raw.deviceCodes : [],
      listBlobs: raw.listBlobs && typeof raw.listBlobs === "object" ? raw.listBlobs : {}
    };
  } catch {
    return structuredClone(EMPTY_STORE);
  }
}

function writeStoreFile(data: StoreFile): void {
  const path = storePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
}

export async function readOnlyStoreAsync(): Promise<StoreFile> {
  const { isAccountSyncRequireTurso } = await import("./enabled");
  const requireTurso = isAccountSyncRequireTurso();
  if (isSqlStoreConfigured()) {
    const sql = await readStoreSql();
    if (sql) return sql;
    if (requireTurso) throw new Error("account-sync-turso-read-failed");
  } else if (requireTurso) {
    throw new Error("account-sync-turso-required");
  }
  return readStoreFile();
}

export async function withStoreAsync<T>(fn: (store: StoreFile) => T | Promise<T>): Promise<T> {
  const { isAccountSyncRequireTurso } = await import("./enabled");
  const requireTurso = isAccountSyncRequireTurso();
  const store = await readOnlyStoreAsync();
  const result = await fn(store);
  if (isSqlStoreConfigured()) {
    const ok = await writeStoreSql(store);
    if (!ok) {
      if (requireTurso) {
        throw new Error("account-sync-turso-write-failed");
      }
      writeStoreFile(store);
    }
  } else if (requireTurso) {
    throw new Error("account-sync-turso-required");
  } else {
    writeStoreFile(store);
  }
  return result;
}

/** Sync file-only path (tests / when SQL not configured). */
export function withStore<T>(fn: (store: StoreFile) => T): T {
  const store = readStoreFile();
  const result = fn(store);
  writeStoreFile(store);
  return result;
}

export function readOnlyStore(): StoreFile {
  return readStoreFile();
}

export function normalizeEmail(email: string): string {
  return String(email || "")
    .trim()
    .toLowerCase();
}

export function findUserByEmail(store: StoreFile, email: string): AccountUser | undefined {
  const e = normalizeEmail(email);
  return store.users.find((u) => u.email === e);
}

export function upsertUser(store: StoreFile, email: string): AccountUser {
  const existing = findUserByEmail(store, email);
  if (existing) return existing;
  const user: AccountUser = {
    id: `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    email: normalizeEmail(email),
    createdAt: new Date().toISOString()
  };
  store.users.push(user);
  return user;
}

export function getListBackup(store: StoreFile, userId: string): {
  backup: unknown | null;
  updatedAt: string | null;
} {
  const row = store.listBlobs[userId];
  if (!row) return { backup: null, updatedAt: null };
  try {
    const json = decryptAtRest(row.ciphertext);
    return { backup: JSON.parse(json), updatedAt: row.updatedAt };
  } catch {
    return { backup: null, updatedAt: null };
  }
}

export function setListBackup(store: StoreFile, userId: string, backup: unknown, updatedAt: string): void {
  store.listBlobs[userId] = {
    ciphertext: encryptAtRest(JSON.stringify(backup)),
    updatedAt
  };
}

export function deleteUserCascade(store: StoreFile, userId: string): void {
  store.users = store.users.filter((u) => u.id !== userId);
  store.sessions = store.sessions.filter((s) => s.userId !== userId);
  store.deviceCodes = store.deviceCodes.filter((d) => d.userId !== userId);
  delete store.listBlobs[userId];
}

/** Test helper — wipe store file contents (and SQL row when configured). */
export function resetAccountStoreForTests(): void {
  writeStoreFile(structuredClone(EMPTY_STORE));
}

export async function resetAccountStoreForTestsAsync(): Promise<void> {
  const empty = structuredClone(EMPTY_STORE);
  if (isSqlStoreConfigured()) {
    const ok = await writeStoreSql(empty);
    if (!ok) writeStoreFile(empty);
  } else {
    writeStoreFile(empty);
  }
}

export function storeBackendLabel(): "sql" | "file" {
  return isSqlStoreConfigured() ? "sql" : "file";
}