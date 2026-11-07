/**
 * Account sync product gate.
 *
 * PRODUCT CANCELLED: magic-link auth + cloud list sync are not shipping.
 * Dead store/auth/mail modules were removed — keep this file + gone.ts for health + 410 routes.
 */
export const ACCOUNT_SYNC_ENABLED_ENV = "ACCOUNT_SYNC_ENABLED";
/** Legacy wrangler echo — sync never uses Turso while cancelled. */
export const ACCOUNT_SYNC_REQUIRE_TURSO_ENV = "ACCOUNT_SYNC_REQUIRE_TURSO";

/** Hard product cancel — do not re-enable without a new product decision. */
export const ACCOUNT_SYNC_PRODUCT_CANCELLED = true;

export function isAccountSyncRequireTurso(): boolean {
  return process.env.ACCOUNT_SYNC_REQUIRE_TURSO === "1";
}

/** Health echo only — true if DATABASE_URL looks like libsql/Turso (does not enable sync). */
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
