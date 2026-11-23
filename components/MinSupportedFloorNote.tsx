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
  min
}: {
  template?: string | null;
  testId: string;
  className?: string;
  source?: string | null;
  min?: string | null;
}) {
  const floorMin = String(min || desktopDownloads.minSupportedVersion || "").trim();
  if (!template?.trim() || !floorMin) return null;
  return (
    <p className={className} data-testid={testId}>
      {formatMinSupportedFloorNote(template, {
        min: floorMin,
        source: source?.trim() || "desktop-downloads.json"
      })}
    </p>
  );
}
