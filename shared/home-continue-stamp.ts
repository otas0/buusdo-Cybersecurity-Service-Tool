/**
 * Shared stamp label for ops home-continue timeline + tag-only fixture.
 *
 * Single source: edit here, then `npm run sync:home-continue-stamp`
 * (writes ops/home-continue-stamp.browser.js for ops/home-continue-timeline.html).
 *
 * If you skip the sync script, edit three places:
 *   1. shared/home-continue-stamp.ts (this file)
 *   2. ops/home-continue-stamp.browser.js (or re-run sync)
 *   3. tests/fixtures/home-continue-stamp-tag-only.html (inline formula)
 */
export function stampLabelFromParams(search: string): string {
  const q = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(q);
  const stampTag = params.get("tag") || "";
  const stampRun = params.get("run") || "";
  return stampTag || stampRun
    ? `Home-continue timeline · ${stampTag || "—"}${stampRun ? ` · run ${stampRun}` : ""}`
    : "Home-continue timeline";
}