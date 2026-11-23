/**
 * Shared min-supported floor formatting (website React + desktop dashboard).
 * Keep in sync with security/min-supported-floor.ts re-export.
 */

/**
 * @param {string} sourceRaw
 * @returns {string}
 */
export function formatMinSupportedSourceLabel(sourceRaw) {
  const raw = String(sourceRaw || "desktop-downloads.json").trim();
  if (!raw || raw === "desktop-downloads.json") return "desktop-downloads.json";
  return raw.split(/[/\\]/).filter(Boolean).pop() || raw;
}

/**
 * @param {string} template
 * @param {{ min: string, source?: string }} opts
 * @returns {string}
 */
export function formatMinSupportedFloorNote(template, opts) {
  const min = String(opts.min || "").trim();
  const source = formatMinSupportedSourceLabel(opts.source);
  return String(template || "")
    .replaceAll("{min}", min)
    .replaceAll("{source}", source);
}
