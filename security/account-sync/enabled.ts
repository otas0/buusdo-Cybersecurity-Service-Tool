/**
 * Account sync product gate.
 *
 * PRODUCT CANCELLED: magic-link auth + cloud list sync are not shipping.
 * Keep modules for offline/local tests only — `isAccountSyncEnabled()` stays false
 * even if ACCOUNT_SYNC_ENABLED=1 is set in env / wrangler.
 */
import { isSqlStoreConfigured } from "./store-sql";

export const ACCOUNT_SYNC_ENABLED_ENV = "ACCOUNT_SYNC_ENABLED";
/** Set to 1 on Cloudflare Workers (wrangler vars) so sync never uses the file store. */
export const ACCOUNT_SYNC_REQUIRE_TURSO_ENV = "ACCOUNT_SYNC_REQUIRE_TURSO";

/** Hard product cancel — do not re-enable without a new product decision. */
export const ACCOUNT_SYNC_PRODUCT_CANCELLED = true;

export function isAccountSyncRequireTurso(): boolean {
  return process.env.ACCOUNT_SYNC_REQUIRE_TURSO === "1";
}

/**
 * Sync APIs stay off while the product is cancelled.
 * Legacy env checks remain for docs/health echo only.
 */
export function isAccountSyncEnabled(): boolean {
  if (ACCOUNT_SYNC_PRODUCT_CANCELLED) return false;
  if (process.env.ACCOUNT_SYNC_ENABLED !== "1") return false;
  if (isAccountSyncRequireTurso() && !isSqlStoreConfigured()) return false;
  return true;
}
