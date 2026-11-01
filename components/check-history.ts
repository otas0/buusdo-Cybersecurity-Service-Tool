"use client";

import { canPersistLists } from "./privacy-storage";
import { getPrivacyMode } from "./report-analysis";

const HISTORY_KEY = "shieldCheckHistory";
const MAX = 30;

export type CheckHistoryEntry = {
  at: string;
  /** Registrable domain only — never a full URL. */
  domain: string;
  level: string;
  /** Live probe duration in ms; null if probe was skipped. */
  probeMs: number | null;
  timedOut: boolean;
  /** Server probe budget at check time (ms), for tuning CHECK_PROBE_TIMEOUT_MS. */
  probeTimeoutMs?: number;
  /** True when live probe fell back from HEAD to GET. */
  probeHeadFailed?: boolean;
  /** True when HEAD was skipped intentionally. */
  headSkipped?: boolean;
  /** True when evidence included probe-blocked (403/429/503) — never store full URL. */
  probeBlocked?: boolean;
};

export type ProbeTimeoutSummary = {
  domain: string;
  checks: number;
  timeouts: number;
  lastProbeMs: number | null;
  maxProbeMs: number | null;
  lastProbeTimeoutMs: number | null;
  headFails: number;
  headSkips: number;
  /** Count of checks with probe-blocked evidence (403/429/503). */
  probeBlocked: number;
};

export function listCheckHistory(): CheckHistoryEntry[] {
  if (typeof localStorage === "undefined" || !canPersistLists()) return [];
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return (raw as CheckHistoryEntry[]).map(normalizeEntry).slice(0, MAX);
  } catch {
    return [];
  }
}

function normalizeEntry(item: Partial<CheckHistoryEntry>): CheckHistoryEntry {
  return {
    at: typeof item.at === "string" ? item.at : new Date().toISOString(),
    domain: String(item.domain || "").toLowerCase(),
    level: String(item.level || ""),
    probeMs: typeof item.probeMs === "number" ? item.probeMs : null,
    timedOut: Boolean(item.timedOut),
    probeTimeoutMs: typeof item.probeTimeoutMs === "number" ? item.probeTimeoutMs : undefined,
    probeHeadFailed: Boolean(item.probeHeadFailed),
    headSkipped: Boolean(item.headSkipped),
    probeBlocked: Boolean(item.probeBlocked)
  };
}

/** Domain + risk + probe timing only — never the full URL or secrets. */
export function pushCheckHistory(input: {
  domain: string;
  level: string;
  probeMs?: number | null;
  timedOut?: boolean;
  probeTimeoutMs?: number;
  probeHeadFailed?: boolean;
  headSkipped?: boolean;
  /** Evidence id probe-blocked only — never a URL. */
  probeBlocked?: boolean;
}) {
  if (typeof localStorage === "undefined" || !canPersistLists(getPrivacyMode())) return;
  const entry: CheckHistoryEntry = {
    at: new Date().toISOString(),
    domain: input.domain.toLowerCase().replace(/\.$/, ""),
    level: input.level,
    probeMs: typeof input.probeMs === "number" ? input.probeMs : null,
    timedOut: Boolean(input.timedOut),
    probeTimeoutMs: typeof input.probeTimeoutMs === "number" ? input.probeTimeoutMs : undefined,
    probeHeadFailed: Boolean(input.probeHeadFailed),
    headSkipped: Boolean(input.headSkipped),
    probeBlocked: Boolean(input.probeBlocked)
  };
  const next = [entry, ...listCheckHistory()].slice(0, MAX);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function clearCheckHistory() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
}

/** Settings history list filter (timeouts / HEAD-skipped / probe-blocked / all). */
export type HistoryListFilter = "all" | "timeouts" | "headSkipped" | "probeBlocked";

export function filterCheckHistory(
  history: CheckHistoryEntry[],
  filter: HistoryListFilter
): CheckHistoryEntry[] {
  if (filter === "timeouts") return history.filter((entry) => entry.timedOut);
  if (filter === "headSkipped") return history.filter((entry) => Boolean(entry.headSkipped));
  if (filter === "probeBlocked") return history.filter((entry) => Boolean(entry.probeBlocked));
  return history;
}

function emptySummary(domain: string): ProbeTimeoutSummary {
  return {
    domain,
    checks: 0,
    timeouts: 0,
    lastProbeMs: null,
    maxProbeMs: null,
    lastProbeTimeoutMs: null,
    headFails: 0,
    headSkips: 0,
    probeBlocked: 0
  };
}

/** Domains that timed out at least once, sorted by timeout count then max probe ms. */
export function summarizeProbeTimeouts(history: CheckHistoryEntry[] = listCheckHistory()): ProbeTimeoutSummary[] {
  const map = new Map<string, ProbeTimeoutSummary>();
  for (const item of history) {
    const current = map.get(item.domain) || emptySummary(item.domain);
    current.checks += 1;
    if (item.timedOut) current.timeouts += 1;
    if (item.probeHeadFailed) current.headFails += 1;
    if (item.headSkipped) current.headSkips += 1;
    if (item.probeBlocked) current.probeBlocked += 1;
    if (typeof item.probeMs === "number") {
      current.lastProbeMs = item.probeMs;
      current.maxProbeMs =
        current.maxProbeMs == null ? item.probeMs : Math.max(current.maxProbeMs, item.probeMs);
    }
    if (typeof item.probeTimeoutMs === "number") {
      current.lastProbeTimeoutMs = item.probeTimeoutMs;
    }
    map.set(item.domain, current);
  }
  return [...map.values()]
    .filter((row) => row.timeouts > 0)
    .sort((a, b) => b.timeouts - a.timeouts || (b.maxProbeMs || 0) - (a.maxProbeMs || 0));
}

/** Domains with repeated HEAD→GET fallbacks (consider skipping HEAD). */
export function summarizeHeadFails(history: CheckHistoryEntry[] = listCheckHistory()): ProbeTimeoutSummary[] {
  const map = new Map<string, ProbeTimeoutSummary>();
  for (const item of history) {
    const current = map.get(item.domain) || emptySummary(item.domain);
    current.checks += 1;
    if (item.timedOut) current.timeouts += 1;
    if (item.probeHeadFailed) current.headFails += 1;
    if (item.headSkipped) current.headSkips += 1;
    if (item.probeBlocked) current.probeBlocked += 1;
    if (typeof item.probeMs === "number") {
      current.lastProbeMs = item.probeMs;
      current.maxProbeMs =
        current.maxProbeMs == null ? item.probeMs : Math.max(current.maxProbeMs, item.probeMs);
    }
    map.set(item.domain, current);
  }
  return [...map.values()]
    .filter((row) => row.headFails >= 2)
    .sort((a, b) => b.headFails - a.headFails || b.checks - a.checks);
}