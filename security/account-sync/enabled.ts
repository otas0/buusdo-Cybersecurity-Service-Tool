/** ACCOUNT_SYNC_ENABLED=1 turns on magic-link auth + list sync APIs. */
import { isSqlStoreConfigured } from "./store-sql";

export const ACCOUNT_SYNC_ENABLED_ENV = "ACCOUNT_SYNC_ENABLED";
/** Set to 1 on Cloudflare Workers (wrangler vars) so sync never uses the file store. */
export const ACCOUNT_SYNC_REQUIRE_TURSO_ENV = "ACCOUNT_SYNC_REQUIRE_TURSO";

export function isAccountSyncRequireTurso(): boolean {
  return process.env.ACCOUNT_SYNC_REQUIRE_TURSO === "1";
}

/**
 * Sync is on only when ACCOUNT_SYNC_ENABLED=1.
 * On Workers (ACCOUNT_SYNC_REQUIRE_TURSO=1), DATABASE_URL / Turso must also be configured —
 * never open the gate on the ephemeral file store.
 */
export function isAccountSyncEnabled(): boolean {
  if (process.env.ACCOUNT_SYNC_ENABLED !== "1") return false;
  if (isAccountSyncRequireTurso() && !isSqlStoreConfigured()) return false;
  return true;
}