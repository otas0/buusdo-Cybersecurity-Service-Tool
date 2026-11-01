import type { RiskEvidence } from "./types";

/** Canonical evidence ids used in product risk output. */
export const EVIDENCE_ID_ALIASES: Record<string, string> = {
  /** Legacy evaluation / docs id → current site-signals / risk id */
  sensitive: "sensitive-path"
};

/**
 * Reserved for personal shield-lists-v1 blocks (extension / desktop).
 * Website check never stores personal lists; emit only when a read-only
 * overlay hint is present (future). Still no website persistence.
 */
export const USER_BLOCK_EVIDENCE_ID = "user-block";

export function canonicalEvidenceId(id: string): string {
  return EVIDENCE_ID_ALIASES[id] || id;
}

/** True if every expected id is present in actual (after alias normalisation). */
export function evidenceIncludesAll(actualIds: string[], expectedIds: string[]): boolean {
  const set = new Set(actualIds.map(canonicalEvidenceId));
  return expectedIds.every((id) => set.has(canonicalEvidenceId(id)));
}

/**
 * Build user-block evidence when a check surface learns of a personal block
 * (read-only hint). Returns null when no personal overlay applied.
 */
export function personalUserBlockEvidence(applied: boolean, detail?: string): RiskEvidence | null {
  if (!applied) return null;
  return {
    id: USER_BLOCK_EVIDENCE_ID,
    kind: "known",
    title: "Personal block list",
    detail:
      detail ||
      "This host is on your personal block list (extension or desktop). The website did not store the list."
  };
}