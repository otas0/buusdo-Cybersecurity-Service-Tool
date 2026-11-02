/**
 * Account list sync must never accept full URLs in backup domain fields —
 * hostnames only (privacy: lists sync, not browsing history).
 */
export function assertBackupDomainsAreHostsOnly(backup: unknown): void {
  if (!backup || typeof backup !== "object") return;
  const data = backup as { blocked?: unknown; trusted?: unknown };
  for (const key of ["blocked", "trusted"] as const) {
    const list = data[key];
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      const raw =
        typeof entry === "string"
          ? entry
          : entry && typeof entry === "object"
            ? String((entry as { domain?: unknown }).domain ?? "")
            : "";
      if (/https?:\/\//i.test(raw) || raw.includes("/") || raw.includes("?") || raw.includes("#")) {
        const err = new Error("backup-full-url-forbidden");
        throw err;
      }
    }
  }
}