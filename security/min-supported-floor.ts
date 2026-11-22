/**
 * Format the honest-limits / probe floor line (min + source).
 * Used when surfacing desktop-downloads.json floor next to result honest-limits.
 */
export function formatMinSupportedFloorNote(
  template: string,
  opts: { min: string; source?: string }
): string {
  const min = String(opts.min || "").trim();
  const sourceRaw = String(opts.source || "desktop-downloads.json").trim();
  const source =
    sourceRaw === "desktop-downloads.json"
      ? sourceRaw
      : sourceRaw.split(/[/\\]/).filter(Boolean).pop() || sourceRaw;
  return template.replaceAll("{min}", min).replaceAll("{source}", source);
}
