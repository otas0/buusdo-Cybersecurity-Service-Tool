import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import type { ThreatState } from "./types";

export const CURATED_LIST_STATES = ["KNOWN_PHISHING", "KNOWN_MALICIOUS"] as const;
export type CuratedListState = (typeof CURATED_LIST_STATES)[number];

export type CuratedThreatFile = {
  updatedAt: string;
  source: string;
  hosts: Record<string, ThreatState>;
  changelog?: Array<{
    at: string;
    batchId: string;
    added: string[];
    removed: string[];
    notes?: string;
  }>;
};

export type ThreatBatchAdd = {
  host: string;
  state: CuratedListState;
  reason?: string;
};

export type ThreatBatchRemove = {
  host: string;
  reason?: string;
};

export type ThreatBatchReviewChecklist = {
  hostsReviewed: boolean;
  falsePositivesConfirmed: boolean;
  readyToApply: boolean;
};

export type ThreatBatch = {
  id: string;
  kind: "report" | "false-positive" | "mixed";
  /** Leave empty until an operator signs off. */
  reviewedBy?: string;
  notes?: string;
  /** Operator must flip these to true before threat:apply. */
  reviewChecklist?: ThreatBatchReviewChecklist;
  add?: ThreatBatchAdd[];
  remove?: ThreatBatchRemove[];
};

export function curatedPath(cwd = process.cwd()): string {
  return resolve(cwd, "security", "data", "curated-threats.json");
}

/** Extra seed list file (OWN_THREAT_MERGE_PT; filename legacy). */
export function curatedPtPath(cwd = process.cwd()): string {
  return resolve(cwd, "security", "data", "curated-threats.pt.json");
}

export type CuratedTarget = "core" | "pt";

export function resolveCuratedTargetPath(target: CuratedTarget = "core", cwd = process.cwd()): string {
  return target === "pt" ? curatedPtPath(cwd) : curatedPath(cwd);
}

function batchTargetKind(field: string | undefined): CuratedTarget | null {
  if (!field) return null;
  if (field === "curated-threats.pt.json" || field === "pt") return "pt";
  if (field === "curated-threats.json" || field === "core") return "core";
  return null;
}

/**
 * When batch.target is set but not a known core/PT token, return a warning string
 * (callers should warn and ignore the field — do not throw).
 */
export function unknownBatchTargetWarning(field: string | undefined): string | null {
  if (field == null || String(field).trim() === "") return null;
  if (batchTargetKind(field) != null) return null;
  return `Unknown batch target "${field}" — expected curated-threats.json|core or curated-threats.pt.json|pt. Ignoring field.`;
}

/** Resolve --target=pt|core and optional batch.target field (no I/O). */
export function resolveThreatApplyTarget(
  argv: string[],
  batch: { target?: string } = {}
): CuratedTarget {
  const targetFlag = argv.find((a) => a.startsWith("--target="));
  const fromBatch = batchTargetKind(batch.target);
  if (targetFlag === "--target=pt") {
    if (fromBatch === "core") {
      throw new Error(
        `--target=pt conflicts with batch "target": "${batch.target}" (core list). Use --target=core or change the batch target field.`
      );
    }
    return "pt";
  }
  if (targetFlag === "--target=core") {
    if (fromBatch === "pt") {
      throw new Error(
        `--target=core conflicts with batch "target": "${batch.target}" (PT list). Use --target=pt or change the batch target field.`
      );
    }
    return "core";
  }
  if (targetFlag) throw new Error(`Unknown ${targetFlag}; use --target=pt or --target=core`);
  if (fromBatch === "pt") return "pt";
  return "core";
}

export function normalizeHost(raw: string): string {
  let value = String(raw || "").trim().toLowerCase();
  if (!value) throw new Error("empty host");
  if (value.includes("://")) {
    value = new URL(value).hostname;
  }
  value = value.replace(/\.$/, "").split("/")[0] || "";
  value = value.replace(/^www\./, "");
  if (!value || value.includes(" ") || !value.includes(".")) {
    throw new Error(`invalid host: ${raw}`);
  }
  return value;
}

export function readCuratedFile(filePath = curatedPath()): CuratedThreatFile {
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as CuratedThreatFile;
  if (!raw.hosts || typeof raw.hosts !== "object") {
    throw new Error("curated-threats.json missing hosts object");
  }
  return {
    updatedAt: raw.updatedAt || "",
    source: raw.source || "buusdo curated list (first-party).",
    hosts: { ...raw.hosts },
    changelog: Array.isArray(raw.changelog) ? [...raw.changelog] : []
  };
}

export function validateCuratedFile(file: CuratedThreatFile): string[] {
  const errors: string[] = [];
  for (const [host, state] of Object.entries(file.hosts)) {
    try {
      const normalized = normalizeHost(host);
      if (normalized !== host) errors.push(`host not normalized: ${host} (expected ${normalized})`);
    } catch {
      errors.push(`invalid host key: ${host}`);
    }
    if (!CURATED_LIST_STATES.includes(state as CuratedListState)) {
      errors.push(`${host}: state must be KNOWN_PHISHING or KNOWN_MALICIOUS (got ${state})`);
    }
  }
  return errors;
}

export type ApplyBatchResult = {
  file: CuratedThreatFile;
  added: string[];
  removed: string[];
  skippedAdd: string[];
  skippedRemove: string[];
};

export function applyBatchToFile(file: CuratedThreatFile, batch: ThreatBatch): ApplyBatchResult {
  if (!batch.id?.trim()) throw new Error("batch.id is required");
  if (!batch.add?.length && !batch.remove?.length) {
    throw new Error("batch must include at least one add or remove entry");
  }

  const hosts = { ...file.hosts };
  const added: string[] = [];
  const removed: string[] = [];
  const skippedAdd: string[] = [];
  const skippedRemove: string[] = [];

  for (const item of batch.remove || []) {
    const host = normalizeHost(item.host);
    if (!(host in hosts)) {
      skippedRemove.push(host);
      continue;
    }
    delete hosts[host];
    removed.push(host);
  }

  for (const item of batch.add || []) {
    const host = normalizeHost(item.host);
    if (!CURATED_LIST_STATES.includes(item.state)) {
      throw new Error(`${host}: invalid state ${item.state}`);
    }
    if (hosts[host] === item.state) {
      skippedAdd.push(host);
      continue;
    }
    hosts[host] = item.state;
    added.push(host);
  }

  const at = new Date().toISOString().slice(0, 10);
  const changelog = [
    {
      at,
      batchId: batch.id.trim(),
      added,
      removed,
      notes: batch.notes || undefined
    },
    ...(file.changelog || [])
  ].slice(0, 50);

  return {
    file: {
      updatedAt: at,
      source: file.source,
      hosts: sortHosts(hosts),
      changelog
    },
    added,
    removed,
    skippedAdd,
    skippedRemove
  };
}

function sortHosts(hosts: Record<string, ThreatState>): Record<string, ThreatState> {
  return Object.fromEntries(Object.entries(hosts).sort(([a], [b]) => a.localeCompare(b)));
}

export function writeCuratedFile(file: CuratedThreatFile, filePath = curatedPath()) {
  const body = `${JSON.stringify(file, null, 2)}\n`;
  writeFileSync(filePath, body, "utf8");
}

export function loadBatch(batchPath: string): ThreatBatch {
  const raw = JSON.parse(readFileSync(batchPath, "utf8")) as ThreatBatch;
  return raw;
}

/** Archive a applied batch under security/data/batches/applied/ */
export function archiveBatch(batchPath: string, cwd = process.cwd()): string {
  const appliedDir = resolve(cwd, "security", "data", "batches", "applied");
  mkdirSync(appliedDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = join(appliedDir, `${stamp}-${basename(batchPath)}`);
  if (existsSync(batchPath)) {
    renameSync(batchPath, dest);
  }
  return dest;
}

export function ensureBatchesDir(cwd = process.cwd()) {
  const dir = resolve(cwd, "security", "data", "batches");
  mkdirSync(dir, { recursive: true });
  mkdirSync(resolve(dir, "applied"), { recursive: true });
  return dir;
}

export function batchDirOf(filePath: string): string {
  return dirname(resolve(filePath));
}