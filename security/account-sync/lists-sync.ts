import {
  parseBackup,
  mergeBackups,
  serializeBackup
} from "../../shared/shield-lists.mjs";
import { isE2EEnvelope } from "../../shared/lists-e2e-crypto.mjs";
import { assertListsWithinCap, listsMaxBytes } from "./lists-cap";
import { getListBackup, readOnlyStore, setListBackup, withStore } from "./store";

export function parseShieldListsOrThrow(raw: unknown) {
  return parseBackup(raw);
}

export function getUserLists(userId: string) {
  return getListBackup(readOnlyStore(), userId);
}

export type PutConflictMode = "merge" | "replace-cloud" | "replace-device";

export type PutListsResult = {
  backup: unknown;
  updatedAt: string;
  etag: string;
  merged: boolean;
  conflict?: boolean;
};

export function putUserLists(
  userId: string,
  incomingRaw: unknown,
  baseUpdatedAt?: string | null,
  mode: PutConflictMode = "merge"
): PutListsResult {
  // E2E envelope: store opaque; size-cap on JSON bytes only.
  if (isE2EEnvelope(incomingRaw)) {
    const envelope = incomingRaw as { updatedAt?: string };
    const maxBytes = listsMaxBytes();
    const bytes = Buffer.byteLength(JSON.stringify(incomingRaw), "utf8");
    if (bytes > maxBytes) {
      const err = new Error("lists-too-large") as Error & {
        cap: { code: "lists-too-large"; bytes: number; maxBytes: number };
      };
      err.cap = { code: "lists-too-large", bytes, maxBytes };
      throw err;
    }
    return withStore((store) => {
      if (mode === "replace-cloud") {
        const current = getListBackup(store, userId);
        const updatedAt = current.updatedAt || new Date().toISOString();
        return {
          backup: current.backup,
          updatedAt,
          etag: `"${updatedAt}"`,
          merged: false,
          conflict: Boolean(current.backup)
        };
      }
      const updatedAt = envelope.updatedAt || new Date().toISOString();
      setListBackup(store, userId, incomingRaw, updatedAt);
      return {
        backup: incomingRaw,
        updatedAt,
        etag: `"${updatedAt}"`,
        merged: false
      };
    });
  }

  const incoming = parseBackup(incomingRaw);
  assertListsWithinCap(incoming);

  return withStore((store) => {
    const current = getListBackup(store, userId);

    if (mode === "replace-cloud") {
      const updatedAt = current.updatedAt || new Date().toISOString();
      return {
        backup: current.backup || incoming,
        updatedAt,
        etag: `"${updatedAt}"`,
        merged: false,
        conflict: Boolean(current.backup)
      };
    }

    if (mode === "replace-device") {
      const updatedAt = incoming.updatedAt || new Date().toISOString();
      const next = { ...incoming, updatedAt };
      setListBackup(store, userId, next, updatedAt);
      return {
        backup: next,
        updatedAt,
        etag: `"${updatedAt}"`,
        merged: false
      };
    }

    let merged = false;
    let next = incoming;
    let conflict = false;
    if (
      current.backup &&
      current.updatedAt &&
      baseUpdatedAt &&
      current.updatedAt !== baseUpdatedAt
    ) {
      next = mergeBackups(current.backup as never, incoming);
      merged = true;
      conflict = true;
    } else if (current.backup && !baseUpdatedAt && current.updatedAt !== incoming.updatedAt) {
      next = mergeBackups(current.backup as never, incoming);
      merged = true;
      conflict = true;
    }
    const updatedAt = next.updatedAt || new Date().toISOString();
    next = { ...next, updatedAt };
    setListBackup(store, userId, next, updatedAt);
    return {
      backup: next,
      updatedAt,
      etag: `"${updatedAt}"`,
      merged,
      conflict
    };
  });
}

export { serializeBackup, isE2EEnvelope };