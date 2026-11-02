/**
 * Reveal a file in Finder/Explorer/file manager.
 * Prefer Electron shell when present; else macOS `open -R`, Linux `xdg-open` (parent dir),
 * Windows `explorer /select`.
 *
 * @param {string} file
 * @param {{
 *   platform?: string,
 *   spawnSync?: typeof import("child_process").spawnSync,
 *   electronShell?: { openPath?: (p: string) => Promise<string> } | null,
 *   pathMod?: typeof import("path")
 * }} [deps]
 */
async function revealPathInShell(file, deps = {}) {
  const platform = deps.platform || process.platform;
  const pathMod = deps.pathMod || require("path");
  /** @type {{ openPath?: (p: string) => Promise<string> } | null} */
  let shellApi =
    deps.electronShell !== undefined
      ? deps.electronShell
      : global.__shieldElectronShell || null;
  if (!shellApi && deps.electronShell === undefined && typeof process.versions?.electron === "string") {
    try {
      // eslint-disable-next-line import/no-unresolved -- optional Electron runtime
      shellApi = require("electron").shell;
    } catch {
      shellApi = null;
    }
  }
  if (shellApi?.openPath) {
    try {
      const err = await shellApi.openPath(file);
      if (!err) return { ok: true, path: file, via: "electron" };
      return { ok: false, error: err, path: file, status: 500 };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "reveal-failed",
        path: file,
        status: 500
      };
    }
  }

  const spawnSync = deps.spawnSync || require("child_process").spawnSync;
  try {
    if (platform === "darwin") {
      const r = spawnSync("open", ["-R", file], { encoding: "utf8" });
      if (r.status === 0) return { ok: true, path: file, via: "open-R" };
      return {
        ok: false,
        error: (r.stderr || r.stdout || "open-R-failed").trim(),
        path: file,
        status: 500
      };
    }
    if (platform === "linux") {
      const parent = pathMod.dirname(file);
      const r = spawnSync("xdg-open", [parent], { encoding: "utf8" });
      if (r.error && r.error.code === "ENOENT") {
        return { ok: false, deferred: true, path: file, hint: "xdg-open not found" };
      }
      if (r.status === 0 || r.status === null) return { ok: true, path: file, via: "xdg-open" };
      return {
        ok: false,
        error: (r.stderr || r.stdout || "xdg-open-failed").trim(),
        path: file,
        status: 500
      };
    }
    if (platform === "win32") {
      const r = spawnSync("explorer", [`/select,${file}`], { encoding: "utf8" });
      if (!r.error) return { ok: true, path: file, via: "explorer-select" };
      return {
        ok: false,
        error: r.error.message,
        path: file,
        status: 500
      };
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "reveal-fallback-failed",
      path: file,
      status: 500
    };
  }

  return {
    ok: false,
    deferred: true,
    path: file,
    hint: "No reveal helper for this platform."
  };
}

module.exports = { revealPathInShell };