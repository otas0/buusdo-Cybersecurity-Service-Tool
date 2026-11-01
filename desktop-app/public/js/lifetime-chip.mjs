/**
 * Lifetime Σ tip vs ring-buffer badge — pure helper for dashboard chips.
 * @param {number|null|undefined} total
 * @param {string} tip
 * @returns {{ show: boolean, title: string, parentTitle: string }}
 */
export function lifetimeChipTitles(total, tip) {
  const n = Number(total) || 0;
  if (n > 0) {
    return { show: true, title: tip, parentTitle: tip };
  }
  // Clear tips when empty so parent chips do not keep a stale Σ explanation.
  return { show: false, title: "", parentTitle: "" };
}

/**
 * UI “clear ring” — empty recent-log badges without wiping lifetime Σ.
 * @param {number|null|undefined} lifetimeTotal
 * @param {string} tip
 * @returns {{ ringBlocks: [], lifetime: ReturnType<typeof lifetimeChipTitles> }}
 */
export function afterRingClear(lifetimeTotal, tip) {
  return {
    ringBlocks: [],
    lifetime: lifetimeChipTitles(lifetimeTotal, tip)
  };
}