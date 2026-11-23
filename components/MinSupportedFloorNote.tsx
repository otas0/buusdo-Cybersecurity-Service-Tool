"use client";

import { useEffect, useState } from "react";
import desktopDownloads from "../shared/desktop-downloads.json" with { type: "json" };
import { formatMinSupportedFloorNote } from "../security/min-supported-floor";

/** Shared honest-limits / privacy floor line from desktop-downloads.json (or API source). */
export function MinSupportedFloorNote({
  template,
  testId,
  className = "hint",
  /** Override source label (e.g. basename from GET /api/min-supported). Default: desktop-downloads.json. */
  source,
  /** Override min semver (e.g. from desktop API). Default: shared/desktop-downloads.json. */
  min,
  /**
   * When true, soft-fetch `/api/desktop-downloads/status` for future
   * `minSupportedSource` / `minSupportedVersion` fields (passthrough when present).
   */
  resolveFromStatus = false
}: {
  template?: string | null;
  testId: string;
  className?: string;
  source?: string | null;
  min?: string | null;
  resolveFromStatus?: boolean;
}) {
  const [apiSource, setApiSource] = useState<string | null>(null);
  const [apiMin, setApiMin] = useState<string | null>(null);

  useEffect(() => {
    if (!resolveFromStatus) return;
    let cancelled = false;
    void fetch("/api/desktop-downloads/status")
      .then((r) => r.json())
      .then((raw: unknown) => {
        if (cancelled || !raw || typeof raw !== "object") return;
        const data = raw as {
          minSupportedSource?: string;
          source?: string;
          minSupportedVersion?: string;
        };
        const src = String(data.minSupportedSource || data.source || "").trim();
        const m = String(data.minSupportedVersion || "").trim();
        if (src) setApiSource(src);
        if (m) setApiMin(m);
      })
      .catch(() => {
        /* keep static JSON floor */
      });
    return () => {
      cancelled = true;
    };
  }, [resolveFromStatus]);

  const floorMin = String(min || apiMin || desktopDownloads.minSupportedVersion || "").trim();
  const floorSource = String(source || apiSource || "desktop-downloads.json").trim();
  if (!template?.trim() || !floorMin) return null;
  return (
    <p className={className} data-testid={testId}>
      {formatMinSupportedFloorNote(template, {
        min: floorMin,
        source: floorSource
      })}
    </p>
  );
}
