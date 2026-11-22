import desktopDownloads from "../shared/desktop-downloads.json" with { type: "json" };
import { formatMinSupportedFloorNote } from "../security/min-supported-floor";

/** Shared honest-limits / privacy floor line from desktop-downloads.json. */
export function MinSupportedFloorNote({
  template,
  testId,
  className = "hint"
}: {
  template?: string | null;
  testId: string;
  className?: string;
}) {
  const min = String(desktopDownloads.minSupportedVersion || "").trim();
  if (!template?.trim() || !min) return null;
  return (
    <p className={className} data-testid={testId}>
      {formatMinSupportedFloorNote(template, {
        min,
        source: "desktop-downloads.json"
      })}
    </p>
  );
}
