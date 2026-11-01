"use client";

import {
  draftsToThreatBatch,
  removeDraft,
  suggestedBatchFilename,
  upsertDraft,
  type FeedbackDraft,
  type FeedbackMark
} from "../security/feedback-batch";
import { canPersistLists } from "./privacy-storage";
import { getPrivacyMode } from "./report-analysis";

export const FEEDBACK_DRAFTS_KEY = "shieldFeedbackDrafts";

export type { FeedbackDraft, FeedbackMark };

export function listFeedbackDrafts(): FeedbackDraft[] {
  if (typeof localStorage === "undefined" || !canPersistLists()) return [];
  try {
    const raw = JSON.parse(localStorage.getItem(FEEDBACK_DRAFTS_KEY) || "[]");
    return Array.isArray(raw) ? (raw as FeedbackDraft[]) : [];
  } catch {
    return [];
  }
}

function write(list: FeedbackDraft[]) {
  localStorage.setItem(FEEDBACK_DRAFTS_KEY, JSON.stringify(list.slice(0, 100)));
}

export function saveFeedbackDraft(input: {
  domain: string;
  level: string;
  mark: FeedbackMark;
}): { ok: boolean; persisted: boolean; drafts: FeedbackDraft[] } {
  if (typeof localStorage === "undefined") return { ok: false, persisted: false, drafts: [] };
  if (!canPersistLists(getPrivacyMode())) {
    return { ok: false, persisted: false, drafts: [] };
  }
  const next = upsertDraft(listFeedbackDrafts(), {
    at: new Date().toISOString(),
    domain: input.domain.toLowerCase().replace(/\.$/, ""),
    level: input.level,
    mark: input.mark
  });
  write(next);
  return { ok: true, persisted: true, drafts: next };
}

export function deleteFeedbackDraft(domain: string, mark: FeedbackMark) {
  if (typeof localStorage === "undefined" || !canPersistLists()) return;
  write(removeDraft(listFeedbackDrafts(), domain, mark));
}

export function clearFeedbackDrafts() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(FEEDBACK_DRAFTS_KEY);
}

/** Download a batches/*.json draft for operator review + threat:apply. */
export function exportFeedbackBatchDownload(
  drafts: FeedbackDraft[] = listFeedbackDrafts(),
  options: {
    reviewedBy?: string;
    notes?: string;
    reviewChecklist?: {
      hostsReviewed?: boolean;
      falsePositivesConfirmed?: boolean;
      readyToApply?: boolean;
    };
  } = {}
): {
  ok: boolean;
  filename?: string;
} {
  if (!drafts.length) return { ok: false };
  const batch = draftsToThreatBatch(drafts, {
    reviewedBy: options.reviewedBy ?? "",
    notes: options.notes,
    reviewChecklist: options.reviewChecklist
  });
  const filename = suggestedBatchFilename(batch);
  const blob = new Blob([`${JSON.stringify(batch, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { ok: true, filename };
}