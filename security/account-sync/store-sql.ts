/**
 * Turso / libsql backend for account sync (multi-instance).
 * Activated when DATABASE_URL is set (libsql:// or https://…turso…).
 * Persists the same StoreFile JSON document as a single row — same API as file store.
 */
import type { StoreFile } from "./store-types";
import { EMPTY_STORE } from "./store-types";

const ROW_ID = "default";

type LibsqlClient = {
  execute: (stmt: { sql: string; args?: unknown[] }) => Promise<{
    rows: Record<string, unknown>[];
  }>;
};

let clientPromise: Promise<LibsqlClient | null> | null = null;
let ensured = false;

export function isSqlStoreConfigured(): boolean {
  const url = (process.env.DATABASE_URL || "").trim();
  if (!url) return false;
  return (
    url.startsWith("libsql://") ||
    url.startsWith("https://") ||
    url.includes("turso.io") ||
    url.startsWith("file:")
  );
}

async function getClient(): Promise<LibsqlClient | null> {
  if (!isSqlStoreConfigured()) return null;
  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        // Optional dependency — keep specifier dynamic so vinext/rolldown does not
        // fail the Workers build when @libsql/client is not installed.
        const spec = "@libsql/" + "client";
        const mod = (await import(/* @vite-ignore */ spec)) as {
          createClient: (opts: { url: string; authToken?: string }) => LibsqlClient;
        };
        return mod.createClient({
          url: process.env.DATABASE_URL!.trim(),
          authToken: process.env.DATABASE_AUTH_TOKEN || undefined
        });
      } catch (err) {
        console.warn(
          "[account-sync] @libsql/client unavailable — falling back to file store",
          err instanceof Error ? err.message : err
        );
        return null;
      }
    })();
  }
  return clientPromise;
}

async function ensureSchema(client: LibsqlClient): Promise<void> {
  if (ensured) return;
  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS account_sync_store (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  });
  ensured = true;
}

export async function readStoreSql(): Promise<StoreFile | null> {
  const client = await getClient();
  if (!client) return null;
  await ensureSchema(client);
  const result = await client.execute({
    sql: "SELECT payload FROM account_sync_store WHERE id = ?",
    args: [ROW_ID]
  });
  const row = result.rows[0];
  if (!row || typeof row.payload !== "string") return structuredClone(EMPTY_STORE);
  try {
    const raw = JSON.parse(row.payload) as StoreFile;
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

export async function writeStoreSql(data: StoreFile): Promise<boolean> {
  const client = await getClient();
  if (!client) return false;
  await ensureSchema(client);
  await client.execute({
    sql: `INSERT INTO account_sync_store (id, payload, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
    args: [ROW_ID, JSON.stringify(data), new Date().toISOString()]
  });
  return true;
}