/**
 * Cloud snapshot size / entry caps for PUT /api/sync/lists.
 * Over limit → HTTP 413 with error code for i18n.
 */

export function listsMaxEntries(): number {
  return Number(process.env.ACCOUNT_SYNC_MAX_ENTRIES || 2000);
}

export function listsMaxBytes(): number {
  return Number(process.env.ACCOUNT_SYNC_MAX_BYTES || 512_000);
}

/** @deprecated use listsMaxEntries() — kept for callers that snapshot at import time in tests */
export const LISTS_MAX_ENTRIES = listsMaxEntries();
export const LISTS_MAX_BYTES = listsMaxBytes();

export type ListsCapError = {
  code: "lists-too-many-entries" | "lists-too-large";
  entries?: number;
  maxEntries?: number;
  bytes?: number;
  maxBytes?: number;
};

export function assertListsWithinCap(backup: {
  blocked?: unknown[];
  trusted?: unknown[];
}): void {
  const maxEntries = listsMaxEntries();
  const maxBytes = listsMaxBytes();
  const blocked = Array.isArray(backup.blocked) ? backup.blocked.length : 0;
  const trusted = Array.isArray(backup.trusted) ? backup.trusted.length : 0;
  const entries = blocked + trusted;
  if (entries > maxEntries) {
    const err = new Error("lists-too-many-entries") as Error & { cap: ListsCapError };
    err.cap = {
      code: "lists-too-many-entries",
      entries,
      maxEntries
    };
    throw err;
  }
  const bytes = Buffer.byteLength(JSON.stringify(backup), "utf8");
  if (bytes > maxBytes) {
    const err = new Error("lists-too-large") as Error & { cap: ListsCapError };
    err.cap = {
      code: "lists-too-large",
      bytes,
      maxBytes
    };
    throw err;
  }
}

export function capErrorFromUnknown(err: unknown): ListsCapError | null {
  if (!err || typeof err !== "object") return null;
  const cap = (err as { cap?: ListsCapError }).cap;
  return cap?.code ? cap : null;
}