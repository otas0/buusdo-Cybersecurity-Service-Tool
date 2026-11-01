/**
 * Skip HEAD for hosts that repeatedly reject/fail HEAD (server memory + disk + client hints).
 * First-party only — never stores full URLs.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const FAIL_THRESHOLD = 2;
const TTL_MS = 24 * 60 * 60 * 1000;
const STORE_PATH = resolve(process.cwd(), "security", "data", "runtime", "head-skip.json");

type Entry = { fails: number; until: number };

const cache = new Map<string, Entry>();
let loaded = false;

function normalizeDomain(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .replace(/\.$/, "")
    .trim();
}

function prune(now = Date.now()) {
  for (const [domain, entry] of cache) {
    if (entry.until <= now) cache.delete(domain);
  }
}

function loadFromDisk() {
  if (loaded) return;
  loaded = true;
  try {
    if (!existsSync(STORE_PATH)) return;
    const raw = JSON.parse(readFileSync(STORE_PATH, "utf8")) as {
      hosts?: Record<string, Entry>;
    };
    const hosts = raw.hosts && typeof raw.hosts === "object" ? raw.hosts : {};
    const now = Date.now();
    for (const [domain, entry] of Object.entries(hosts)) {
      if (!entry || typeof entry.fails !== "number" || typeof entry.until !== "number") continue;
      if (entry.until <= now) continue;
      cache.set(normalizeDomain(domain), { fails: entry.fails, until: entry.until });
    }
  } catch {
    /* ignore corrupt store */
  }
}

function persistToDisk() {
  try {
    prune();
    mkdirSync(dirname(STORE_PATH), { recursive: true });
    const hosts: Record<string, Entry> = {};
    for (const [domain, entry] of cache) {
      hosts[domain] = entry;
    }
    writeFileSync(
      STORE_PATH,
      `${JSON.stringify({ updatedAt: new Date().toISOString(), hosts }, null, 2)}\n`,
      "utf8"
    );
  } catch {
    /* disk optional in read-only environments */
  }
}

/** Record a HEAD→GET fallback for a registrable domain. */
export function rememberHeadFail(domain: string) {
  loadFromDisk();
  const key = normalizeDomain(domain);
  if (!key) return;
  prune();
  const now = Date.now();
  const prev = cache.get(key);
  const fails = (prev && prev.until > now ? prev.fails : 0) + 1;
  cache.set(key, { fails, until: now + TTL_MS });
  persistToDisk();
}

export type HeadSkipEntry = {
  domain: string;
  fails: number;
  /** Epoch ms when this skip entry expires. */
  until: number;
};

/** Wire shape for /api/health and /api/head-skip/clear (until as ISO string). */
export type HeadSkipEntrySerialized = {
  domain: string;
  fails: number;
  until: string;
};

/** Serialize epoch `until` to ISO for API responses. */
export function serializeHeadSkipEntry(row: HeadSkipEntry): HeadSkipEntrySerialized {
  return {
    domain: row.domain,
    fails: row.fails,
    until: new Date(row.until).toISOString()
  };
}

/** Domains currently marked to skip HEAD (server cache), with expiry. */
export function listHeadSkipEntries(): HeadSkipEntry[] {
  loadFromDisk();
  prune();
  const now = Date.now();
  return [...cache.entries()]
    .filter(([, entry]) => entry.fails >= FAIL_THRESHOLD && entry.until > now)
    .map(([domain, entry]) => ({ domain, fails: entry.fails, until: entry.until }))
    .sort((a, b) => a.until - b.until || a.domain.localeCompare(b.domain));
}

/** Domains currently marked to skip HEAD (server cache). */
export function listHeadSkipDomains(): string[] {
  return listHeadSkipEntries().map((row) => row.domain);
}

/**
 * Whether to skip HEAD for this domain.
 * True if server cache hit OR client hint list includes the domain (or a parent).
 */
export function shouldSkipHead(domain: string, clientHints: string[] = []): boolean {
  loadFromDisk();
  const key = normalizeDomain(domain);
  if (!key) return false;
  prune();
  const now = Date.now();
  const entry = cache.get(key);
  if (entry && entry.fails >= FAIL_THRESHOLD && entry.until > now) return true;

  for (const hint of clientHints) {
    const h = normalizeDomain(hint);
    if (!h) continue;
    if (key === h || key.endsWith(`.${h}`)) return true;
  }
  return false;
}

/** Test helper — clear in-memory cache (and empty disk store). */
export function clearHeadSkipCache() {
  cache.clear();
  loaded = true;
  try {
    if (existsSync(STORE_PATH)) {
      writeFileSync(STORE_PATH, `${JSON.stringify({ updatedAt: new Date().toISOString(), hosts: {} }, null, 2)}\n`);
    }
  } catch {
    /* ignore */
  }
}

export function headSkipStorePath(): string {
  return STORE_PATH;
}