"use client";

import { canPersistLists } from "./privacy-storage";
import { getPrivacyMode } from "./report-analysis";

const KEY = "shieldDiagnosticLog";
const MAX = 100;

export type DiagnosticEntry = {
  at: string;
  /** Machine error code only — never a full URL. */
  error: string;
  source: "web";
  /** Optional |header − JSON| seconds when Retry-After header was preferred. */
  deltaSec?: number;
};

export type DiagnosticMeta = {
  deltaSec?: number;
};

export function pushDiagnosticError(error: string, meta?: DiagnosticMeta) {
  if (typeof localStorage === "undefined" || !canPersistLists(getPrivacyMode())) return;
  const code = String(error || "check-failed").slice(0, 80);
  const entry: DiagnosticEntry = {
    at: new Date().toISOString(),
    error: code,
    source: "web"
  };
  if (typeof meta?.deltaSec === "number" && Number.isFinite(meta.deltaSec) && meta.deltaSec >= 0) {
    entry.deltaSec = Math.round(meta.deltaSec);
  }
  try {
    const prev = JSON.parse(localStorage.getItem(KEY) || "[]");
    const next = [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function listDiagnosticErrors(): DiagnosticEntry[] {
  if (typeof localStorage === "undefined" || !canPersistLists()) return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? (raw as DiagnosticEntry[]).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export type DiagnosticAggregate = {
  error: string;
  count: number;
  lastAt: string;
  /** Newest non-null deltaSec for this code (support). */
  lastDeltaSec?: number;
};

/** Aggregate by error code (newest lastAt wins). */
export function summarizeDiagnosticErrors(
  entries: DiagnosticEntry[] = listDiagnosticErrors()
): DiagnosticAggregate[] {
  const map = new Map<string, DiagnosticAggregate>();
  for (const item of entries) {
    const current = map.get(item.error) || { error: item.error, count: 0, lastAt: item.at };
    current.count += 1;
    if (item.at > current.lastAt) {
      current.lastAt = item.at;
      if (typeof item.deltaSec === "number") current.lastDeltaSec = item.deltaSec;
    } else if (current.lastDeltaSec == null && typeof item.deltaSec === "number") {
      current.lastDeltaSec = item.deltaSec;
    }
    map.set(item.error, current);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt));
}

/** Newest rate-limited-header-preferred entry (for Settings one-liner). */
export function lastHeaderPreferredDiagnostic(
  entries: DiagnosticEntry[] = listDiagnosticErrors()
): DiagnosticEntry | null {
  let best: DiagnosticEntry | null = null;
  for (const item of entries) {
    if (item.error !== "rate-limited-header-preferred") continue;
    if (!best || item.at > best.at) best = item;
  }
  return best;
}

export function clearDiagnosticLog() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KEY);
}