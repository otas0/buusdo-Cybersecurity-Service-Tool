/**
 * Path and host rules for the desktop machine scan.
 * Quarantine never touches system prefixes, shell startup files, or this repo.
 */

const path = require("path");

const SKIP_TLDS = new Set(
  "js mjs cjs jsx ts tsx json md css html htm xml svg png jpg jpeg gif webp ico pdf exe dll dmg pkg bat cmd ps1 vbs sh zip gz tgz wasm map lock yml yaml txt log csv tsv woff woff2 ttf otf mp3 mp4 mov avi webm apk msi deb rpm jar class py rb go rs php c h cpp hpp cs sql plist webloc url lnk scr hta desktop command".split(
    " "
  )
);

const HOST_TLDS =
  "com|net|org|pt|io|co|uk|de|fr|es|it|nl|eu|app|dev|info|biz|me|tv|cc|us|br|xyz|online|site|shop|top|live|cloud|page|example";

const BARE_HOST = new RegExp(
  `\\b((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+(?:${HOST_TLDS}))\\b`,
  "gi"
);

const URL_HOST = /https?:\/\/([a-z0-9.-]+\.[a-z]{2,24})/gi;

const DISGUISE =
  /\.(?:pdf|docx?|xlsx?|pptx?|jpe?g|png|gif|txt|zip|mp4|mp3)\.(?:exe|scr|bat|cmd|com|js|jse|vbs|ps1|apk|dmg|pkg|command|msi)$/i;

const SHELL_RC = new Set([
  ".zshrc",
  ".zprofile",
  ".zshenv",
  ".bashrc",
  ".bash_profile",
  ".profile",
  ".bash_login"
]);

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  "Caches",
  "Cache",
  "GPUCache",
  "Code Cache",
  "DawnGraphiteCache",
  "DawnCache",
  "GrShaderCache",
  "ShaderCache",
  "CachedData",
  "blob_storage",
  "Service Worker",
  "IndexedDB",
  ".npm",
  ".cache",
  "DerivedData",
  ".Trash",
  "Trash",
  "__pycache__",
  ".venv",
  "venv",
  "site-packages",
  "Pods",
  "bower_components",
  "Cellar",
  ".ssh",
  ".gnupg",
  ".aws",
  ".kube",
  "Keychains",
  "Mail",
  "Messages"
]);

function compareKey(filePath, platform = process.platform) {
  const value = String(filePath || "");
  if (platform === "win32") return value.replace(/\//g, "\\").replace(/\\+$/, "").toLowerCase();
  return path.resolve(value);
}

function isUnder(child, parent, platform = process.platform) {
  if (!child || !parent) return false;
  const sep = platform === "win32" ? "\\" : path.sep;
  const c = compareKey(child, platform);
  const p = compareKey(parent, platform);
  return c === p || c.startsWith(p.endsWith(sep) ? p : p + sep);
}

function isUnderAny(child, parents) {
  return (parents || []).some((parent) => isUnder(child, parent));
}

function systemPrefixes(platform = process.platform) {
  if (platform === "win32") {
    const windir = process.env.SystemRoot || process.env.WINDIR || "C:\\Windows";
    const pf = process.env.ProgramFiles || "C:\\Program Files";
    const pf86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    return [windir, pf, pf86];
  }
  if (platform === "linux") {
    return ["/usr", "/bin", "/sbin", "/lib", "/lib64", "/boot", "/proc", "/sys", "/etc", "/dev", "/run"];
  }
  return ["/System", "/usr", "/bin", "/sbin", "/etc", "/Library/Apple", "/private/var/db", "/Applications"];
}

function isProtectedSystemPath(filePath, platform = process.platform) {
  if (!filePath) return false;
  return systemPrefixes(platform).some((prefix) => isUnder(filePath, prefix, platform));
}

/**
 * User-owned files may be quarantined. /usr, /etc, Windows, and Program Files are report-only.
 * @param {string} filePath
 * @param {string} homeDir
 * @param {string} [platform]
 */
function mayQuarantinePath(filePath, homeDir, platform = process.platform) {
  if (!filePath || !homeDir) return false;
  if (isProtectedSystemPath(filePath, platform)) return false;
  if (platform !== "win32" && isShellRc(filePath, homeDir)) return false;
  if (isUnder(filePath, homeDir, platform)) return true;
  return platform !== "win32" && isTempOrDownloadsPath(filePath);
}

function extractProgramPaths(text, platform) {
  const source = String(text || "");
  if (platform === "win32") {
    const found =
      source.match(/[A-Za-z]:\\(?:[^\\\r\n:*?"<>|]+\\)*[^\\\r\n:*?"<>|]+\.(?:exe|scr|bat|cmd|ps1|vbs|com)/gi) ||
      [];
    return [...new Set(found)];
  }
  const found = source.match(/\/(?:usr|etc|bin|sbin|tmp|var|home|opt|Users)\/[^\s"'<>|]+/g) || [];
  return [...new Set(found.map((item) => item.replace(/[),;]+$/, "")))];
}

/**
 * Startup text from schtasks, Run keys, crontab, or autostart.
 * Only user-owned paths are quarantine; system paths stay report-only.
 */
function planSystemTargets(text, { platform, homeDir }) {
  return extractProgramPaths(text, platform).map((filePath) => ({
    path: filePath,
    action: mayQuarantinePath(filePath, homeDir, platform) ? "quarantine" : "report-only"
  }));
}

function isDisguisedName(name) {
  return DISGUISE.test(String(name || ""));
}

function isShellRc(filePath, homeDir) {
  if (!filePath || !homeDir) return false;
  return SHELL_RC.has(path.basename(filePath)) && path.resolve(path.dirname(filePath)) === path.resolve(homeDir);
}

function isTempOrDownloadsPath(filePath) {
  const value = String(filePath || "").replace(/\\/g, "/").toLowerCase();
  return (
    value.includes("/tmp/") ||
    value.includes("/var/tmp/") ||
    value.includes("/private/tmp/") ||
    value.includes("/downloads/") ||
    value.includes("/temp/") ||
    value.endsWith("/tmp") ||
    value.endsWith("/downloads")
  );
}

/** Local drop paths inside a startup file — not a URL that merely contains /downloads/. */
function textHasLocalDropPath(text) {
  return /(?:^|[\s"'=>])(?:\/tmp\/|\/var\/tmp\/|\/private\/tmp\/|\/users\/[^/\s"'<>]+\/downloads\/|\/home\/[^/\s"'<>]+\/downloads\/|[a-z]:\\[^"'<>|\r\n]*\\(?:downloads|temp)\\)/i.test(
    String(text || "")
  );
}

function isUserStartupPath(filePath, homeDir, platform = process.platform) {
  if (!filePath || !homeDir) return false;
  const checks = [];
  if (platform === "darwin") checks.push(path.join(homeDir, "Library", "LaunchAgents"));
  else if (platform === "linux") checks.push(path.join(homeDir, ".config", "autostart"));
  else if (platform === "win32") {
    checks.push(path.join(homeDir, "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "Startup"));
  }
  return checks.some((dir) => isUnder(filePath, dir));
}

function isSkippedDirName(name) {
  if (!name) return false;
  if (SKIP_DIR_NAMES.has(name)) return true;
  if (name.endsWith(".photoslibrary")) return true;
  return false;
}

function rememberHost(out, raw) {
  let host = String(raw || "")
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/^www\./, "");
  if (!host || host.length > 253 || host.includes("..")) return;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".localhost")) return;
  const tld = host.split(".").pop() || "";
  if (!tld || SKIP_TLDS.has(tld)) return;
  if (!new RegExp(`^(?:${HOST_TLDS})$`, "i").test(tld)) return;
  out.add(host);
}

/**
 * Hosts that can be passed to the address classifier.
 * Bare names must use a real TLD so bundle ids (com.apple.launchd) are ignored.
 * @param {string} text
 * @returns {string[]}
 */
function extractHosts(text) {
  const out = new Set();
  const source = String(text || "");
  for (const match of source.matchAll(URL_HOST)) rememberHost(out, match[1]);
  for (const match of source.matchAll(BARE_HOST)) rememberHost(out, match[1]);
  return [...out];
}

function shouldAsk(view, decision) {
  if (!view || view.status !== "ready") return false;
  if (!view.actionableCount) return false;
  if (decision && decision.findingSetId === view.findingSetId) return false;
  return true;
}

module.exports = {
  BARE_HOST,
  DISGUISE,
  SKIP_DIR_NAMES,
  extractHosts,
  extractProgramPaths,
  isDisguisedName,
  isProtectedSystemPath,
  mayQuarantinePath,
  planSystemTargets,
  isShellRc,
  isSkippedDirName,
  isTempOrDownloadsPath,
  isUserStartupPath,
  textHasLocalDropPath,
  isUnder,
  isUnderAny,
  shouldAsk
};