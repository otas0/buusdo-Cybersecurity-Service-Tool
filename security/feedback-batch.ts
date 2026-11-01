import type { ThreatBatch } from "./curated-ops";

export type FeedbackMark = "report" | "false-positive";

export type FeedbackDraft = {
  at: string;
  /** Host only — never a full URL with path/query/secrets. */
  domain: string;
  level: string;
  mark: FeedbackMark;
};

export type FeedbackExportPlan = {
  addCount: number;
  removeCount: number;
  hostCount: number;
  reportLevels: Record<string, number>;
  falsePositiveLevels: Record<string, number>;
};

export function draftKey(domain: string, mark: FeedbackMark): string {
  return `${mark}:${domain.toLowerCase()}`;
}

/** Upsert by domain+mark; newest wins. */
export function upsertDraft(list: FeedbackDraft[], next: FeedbackDraft): FeedbackDraft[] {
  const key = draftKey(next.domain, next.mark);
  const rest = list.filter((item) => draftKey(item.domain, item.mark) !== key);
  return [next, ...rest].slice(0, 100);
}

export function removeDraft(list: FeedbackDraft[], domain: string, mark: FeedbackMark): FeedbackDraft[] {
  const key = draftKey(domain, mark);
  return list.filter((item) => draftKey(item.domain, item.mark) !== key);
}

function tallyLevels(items: FeedbackDraft[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item.level] = (counts[item.level] || 0) + 1;
  }
  return counts;
}

function formatLevelSummary(counts: Record<string, number>): string {
  const parts = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([level, n]) => `${level}×${n}`);
  return parts.length ? parts.join(", ") : "none";
}

/** Counts hosts that would be written into an exported batch (unique per mark bucket). */
export function summarizeExportPlan(drafts: FeedbackDraft[]): FeedbackExportPlan {
  const addMap = new Map<string, FeedbackDraft>();
  const removeMap = new Map<string, FeedbackDraft>();
  for (const item of drafts) {
    const host = item.domain.toLowerCase().replace(/\.$/, "");
    if (item.mark === "report") addMap.set(host, item);
    else removeMap.set(host, item);
  }
  return {
    addCount: addMap.size,
    removeCount: removeMap.size,
    hostCount: addMap.size + removeMap.size,
    reportLevels: tallyLevels([...addMap.values()]),
    falsePositiveLevels: tallyLevels([...removeMap.values()])
  };
}

export function buildRiskNotes(drafts: FeedbackDraft[]): string {
  const plan = summarizeExportPlan(drafts);
  return [
    "Local feedback export — review before npm run threat:apply.",
    `Hosts to write: ${plan.hostCount} (add ${plan.addCount}, remove ${plan.removeCount}).`,
    `Report risk levels: ${formatLevelSummary(plan.reportLevels)}.`,
    `False-positive risk levels: ${formatLevelSummary(plan.falsePositiveLevels)}.`,
    "Fill reviewedBy and set reviewChecklist.* to true after human review."
  ].join(" ");
}

export type FeedbackReviewChecklist = {
  hostsReviewed: boolean;
  falsePositivesConfirmed: boolean;
  readyToApply: boolean;
};

/**
 * Build a batches/*.json draft from local feedback marks.
 * report → add KNOWN_PHISHING; false-positive → remove.
 * reviewedBy stays empty by default; reviewChecklist from UI (defaults all false).
 */
export function draftsToThreatBatch(
  drafts: FeedbackDraft[],
  options: {
    id?: string;
    reviewedBy?: string;
    notes?: string;
    reviewChecklist?: Partial<FeedbackReviewChecklist>;
  } = {}
): ThreatBatch {
  if (!drafts.length) {
    throw new Error("no feedback drafts to export");
  }

  const addMap = new Map<string, FeedbackDraft>();
  const removeMap = new Map<string, FeedbackDraft>();
  for (const item of drafts) {
    const host = item.domain.toLowerCase().replace(/\.$/, "");
    if (item.mark === "report") addMap.set(host, item);
    else removeMap.set(host, item);
  }

  const hasAdd = addMap.size > 0;
  const hasRemove = removeMap.size > 0;
  const kind = hasAdd && hasRemove ? "mixed" : hasRemove ? "false-positive" : "report";
  const day = new Date().toISOString().slice(0, 10);
  const id = options.id || `${day}-local-feedback`;
  const checklist = options.reviewChecklist || {};

  return {
    id,
    kind,
    reviewedBy: options.reviewedBy ?? "",
    notes: options.notes ?? buildRiskNotes(drafts),
    reviewChecklist: {
      hostsReviewed: Boolean(checklist.hostsReviewed),
      falsePositivesConfirmed: Boolean(checklist.falsePositivesConfirmed),
      readyToApply: Boolean(checklist.readyToApply)
    },
    add: [...addMap.values()].map((item) => ({
      host: item.domain.toLowerCase().replace(/\.$/, ""),
      state: "KNOWN_PHISHING" as const,
      reason: `Local feedback report · risk ${item.level}`
    })),
    remove: [...removeMap.values()].map((item) => ({
      host: item.domain.toLowerCase().replace(/\.$/, ""),
      reason: `Local feedback false-positive · risk was ${item.level}`
    }))
  };
}

export function suggestedBatchFilename(batch: ThreatBatch): string {
  const safe = batch.id.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `${safe}.json`;
}