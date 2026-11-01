/**
 * Personal block/trust lists — shield-lists-v1 (extension + desktop).
 * Website must never persist these lists.
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const SHIELD_LISTS_SCHEMA = "shield-lists-v1";

/** @typedef {{ domain: string, reason?: string, createdAt?: string }} ShieldListEntry */
/** @typedef {{ schema: string, updatedAt: string, blocked: ShieldListEntry[], trusted: ShieldListEntry[] }} ShieldListsBackup */

export function emptyLists(updatedAt = new Date().toISOString()) {
  return {
    schema: SHIELD_LISTS_SCHEMA,
    updatedAt,
    blocked: [],
    trusted: []
  };
}

export function normalizeListHost(raw) {
  let value = String(raw || "")
    .trim()
    .toLowerCase();
  if (!value) throw new Error("empty-host");
  if (value.includes("://")) value = new URL(value).hostname;
  value = value.replace(/\.$/, "").split("/")[0] || "";
  value = value.replace(/^www\./, "");
  if (!value || value.includes(" ") || !value.includes(".")) {
    throw new Error(`invalid-host:${raw}`);
  }
  return value;
}

function normalizeEntry(entry, withReason) {
  const domain = normalizeListHost(entry?.domain ?? entry);
  const createdAt =
    typeof entry?.createdAt === "string" && entry.createdAt
      ? entry.createdAt
      : new Date().toISOString();
  if (withReason) {
    const reason = String(entry?.reason || "user").slice(0, 80);
    return { domain, reason, createdAt };
  }
  return { domain, createdAt };
}

function dedupeByDomain(entries) {
  const map = new Map();
  for (const item of entries) {
    map.set(item.domain, item);
  }
  return [...map.values()].sort((a, b) => a.domain.localeCompare(b.domain));
}

/**
 * @param {unknown} raw
 * @returns {ShieldListsBackup}
 */
export function parseBackup(raw) {
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!data || typeof data !== "object") throw new Error("invalid-backup");
  if (data.schema !== SHIELD_LISTS_SCHEMA) {
    throw new Error(`unsupported-schema:${data.schema || "missing"}`);
  }
  const blocked = Array.isArray(data.blocked)
    ? dedupeByDomain(data.blocked.map((e) => normalizeEntry(e, true)))
    : [];
  const trusted = Array.isArray(data.trusted)
    ? dedupeByDomain(data.trusted.map((e) => normalizeEntry(e, false)))
    : [];
  return {
    schema: SHIELD_LISTS_SCHEMA,
    updatedAt:
      typeof data.updatedAt === "string" && data.updatedAt
        ? data.updatedAt
        : new Date().toISOString(),
    blocked,
    trusted
  };
}

/** @param {Partial<ShieldListsBackup>} lists */
export function serializeBackup(lists) {
  const next = {
    schema: SHIELD_LISTS_SCHEMA,
    updatedAt: lists.updatedAt || new Date().toISOString(),
    blocked: dedupeByDomain(
      (lists.blocked || []).map((e) => normalizeEntry(e, true))
    ),
    trusted: dedupeByDomain(
      (lists.trusted || []).map((e) => normalizeEntry(e, false))
    )
  };
  return `${JSON.stringify(next, null, 2)}\n`;
}

/**
 * Merge imported backup into current (import wins on same domain).
 * @param {ShieldListsBackup} current
 * @param {ShieldListsBackup} incoming
 */
export function mergeBackups(current, incoming) {
  const blocked = dedupeByDomain([...(current.blocked || []), ...(incoming.blocked || [])]);
  const trusted = dedupeByDomain([...(current.trusted || []), ...(incoming.trusted || [])]);
  // If a domain is both blocked and trusted after merge, block wins.
  const blockedSet = new Set(blocked.map((e) => e.domain));
  return {
    schema: SHIELD_LISTS_SCHEMA,
    updatedAt: new Date().toISOString(),
    blocked,
    trusted: trusted.filter((e) => !blockedSet.has(e.domain))
  };
}

export function addBlocked(lists, domain, reason = "user") {
  const entry = normalizeEntry({ domain, reason }, true);
  const blocked = dedupeByDomain([...(lists.blocked || []), entry]);
  const trusted = (lists.trusted || []).filter((e) => e.domain !== entry.domain);
  return {
    schema: SHIELD_LISTS_SCHEMA,
    updatedAt: new Date().toISOString(),
    blocked,
    trusted
  };
}

export function addTrusted(lists, domain) {
  const entry = normalizeEntry({ domain }, false);
  const trusted = dedupeByDomain([...(lists.trusted || []), entry]);
  const blocked = (lists.blocked || []).filter((e) => e.domain !== entry.domain);
  return {
    schema: SHIELD_LISTS_SCHEMA,
    updatedAt: new Date().toISOString(),
    blocked,
    trusted
  };
}

export function removeDomain(lists, domain) {
  const host = normalizeListHost(domain);
  return {
    schema: SHIELD_LISTS_SCHEMA,
    updatedAt: new Date().toISOString(),
    blocked: (lists.blocked || []).filter((e) => e.domain !== host),
    trusted: (lists.trusted || []).filter((e) => e.domain !== host)
  };
}

/** Compact JSON for short QR payloads (no pretty print). Max ~hosts for QR. */
/** Download basename with UTC date — safer USB copies. */
export function backupDownloadName(date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  return `shield-backup-${day}.json`;
}

/** Max personal hosts synced into extension declarativeNetRequest. */
export const PERSONAL_DNR_RULE_LIMIT = 500;

/** Prefix for zlib+base64 dense QR (Node encode; decode in expandQrOrBackup). */
export const QR_ZLIB_PREFIX = "ZB1:";

function denseQrObject(lists, maxHosts) {
  return {
    b: (lists.blocked || []).slice(0, maxHosts).map((e) => e.domain),
    t: (lists.trusted || []).slice(0, maxHosts).map((e) => e.domain)
  };
}

/**
 * Dense QR payload: domain strings only (`b` / `t`) — no schema noise.
 * Pass `{ zlib: true }` for deflate+base64 (`ZB1:…`) when phone cameras fail on long JSON.
 * Import via `expandQrOrBackup`.
 * @param {Partial<ShieldListsBackup>} lists
 * @param {number} [maxHosts]
 * @param {{ zlib?: boolean }} [opts]
 */
export function compactPayloadForQr(lists, maxHosts = 40, opts = {}) {
  const dense = JSON.stringify(denseQrObject(lists, maxHosts));
  if (!opts?.zlib) return dense;
  // Dynamic require keeps this module loadable in browsers that only use dense mode.
  const { deflateSync } = require("node:zlib");
  return QR_ZLIB_PREFIX + deflateSync(Buffer.from(dense, "utf8")).toString("base64");
}

function parseDenseOrFull(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("invalid-backup");
  }
  if (data.schema === SHIELD_LISTS_SCHEMA) return parseBackup(data);
  const blocked = Array.isArray(data.b)
    ? data.b
    : Array.isArray(data.blocked)
      ? data.blocked
      : null;
  const trusted = Array.isArray(data.t)
    ? data.t
    : Array.isArray(data.trusted)
      ? data.trusted
      : null;
  if (!blocked && !trusted) throw new Error("invalid-backup");
  return parseBackup({
    schema: SHIELD_LISTS_SCHEMA,
    updatedAt: new Date().toISOString(),
    blocked: (blocked || []).map((item) =>
      typeof item === "string" ? { domain: item } : item
    ),
    trusted: (trusted || []).map((item) =>
      typeof item === "string" ? { domain: item } : item
    )
  });
}

/**
 * Strip trailing commas so pretty-printed dense JSON still parses.
 * Skips commas inside JSON string values (tracks quotes + escapes).
 */
export function stripJsonTrailingCommas(text) {
  const s = String(text);
  let out = "";
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      out += c;
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      continue;
    }
    if (c === ",") {
      let j = i + 1;
      while (j < s.length && /\s/.test(s[j])) j++;
      if (j < s.length && (s[j] === "]" || s[j] === "}")) continue;
    }
    out += c;
  }
  return out;
}

/**
 * Accept full shield-lists-v1, dense QR `{ b, t }`, or `ZB1:` zlib payload.
 * Pretty-printed dense JSON with trailing commas is accepted.
 * Garbage always throws `invalid-backup` (stable error code).
 * @param {unknown} raw
 */
export function expandQrOrBackup(raw) {
  try {
    let data = raw;
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed.startsWith(QR_ZLIB_PREFIX)) {
        const { inflateSync } = require("node:zlib");
        const json = inflateSync(
          Buffer.from(trimmed.slice(QR_ZLIB_PREFIX.length), "base64")
        ).toString("utf8");
        data = JSON.parse(stripJsonTrailingCommas(json));
      } else {
        data = JSON.parse(stripJsonTrailingCommas(trimmed));
      }
    }
    return parseDenseOrFull(data);
  } catch (err) {
    if (err instanceof Error && err.message === "invalid-backup") throw err;
    throw new Error("invalid-backup");
  }
}

/** Host count for QR canvas limit checks. */
export function listHostCount(lists) {
  return (lists?.blocked?.length || 0) + (lists?.trusted?.length || 0);
}

export function isDomainBlockedInLists(lists, domain) {
  try {
    const host = normalizeListHost(domain);
    return (lists.blocked || []).some((e) => e.domain === host);
  } catch {
    return false;
  }
}

export function isDomainTrustedInLists(lists, domain) {
  try {
    const host = normalizeListHost(domain);
    return (lists.trusted || []).some((e) => e.domain === host);
  } catch {
    return false;
  }
}