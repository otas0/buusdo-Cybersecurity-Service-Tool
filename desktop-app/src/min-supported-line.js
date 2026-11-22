/**
 * Resolve the one-line floor note for honest-limits / GET /api/min-supported.
 * Prefers packed MIN_SUPPORTED.txt (or SHIELD_MIN_SUPPORTED_TXT), else json.
 */
const fs = require("fs");
const path = require("path");

/**
 * @param {{
 *   root: string,
 *   sharedRoot: string,
 *   env?: NodeJS.ProcessEnv,
 *   resourcesPath?: string | null
 * }} opts
 */
function readMinSupportedLine(opts) {
  const env = opts.env || process.env;
  const downloadsPath = path.join(opts.sharedRoot, "desktop-downloads.json");
  const downloads = JSON.parse(fs.readFileSync(downloadsPath, "utf8"));
  const min = String(downloads.minSupportedVersion || "").trim() || null;
  const candidates = [
    env.SHIELD_MIN_SUPPORTED_TXT,
    typeof opts.resourcesPath === "string"
      ? path.join(opts.resourcesPath, "MIN_SUPPORTED.txt")
      : null,
    path.join(opts.root, "Resources", "MIN_SUPPORTED.txt"),
    path.join(opts.root, "packaging", "macos", "MIN_SUPPORTED.txt")
  ].filter(Boolean);

  let line = null;
  let source = null;
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const first = fs.readFileSync(p, "utf8").trim().split(/\r?\n/)[0] || "";
      if (first) {
        line = first;
        source = p;
        break;
      }
    } catch {
      /* try next */
    }
  }
  if (!line && min) {
    line = `buusdo Cybersecurity Service Tool — minimum supported version: ${min}`;
    source = "desktop-downloads.json";
  }
  return { ok: true, line, minSupportedVersion: min, source };
}

module.exports = { readMinSupportedLine };
