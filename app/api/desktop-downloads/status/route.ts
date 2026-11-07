import desktopDownloads from "../../../../shared/desktop-downloads.json";

export const runtime = "nodejs";

/** Soft HEAD — never throws; status 0 means unreachable. */
async function softHead(url: string) {
  if (!url) return { ok: false, status: 0 };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctrl.signal });
    clearTimeout(timer);
    return { ok: res.status === 200, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

/**
 * Settings soft status for macOS downloads (no secrets).
 * Shipping channel is unsigned GitHub Release; notarized promote is optional/out of scope.
 */
export async function GET() {
  const primary = String(desktopDownloads.macosAppZipUrl || "").trim();
  const notarized = String(desktopDownloads.macosAppZipUrlNotarized || "").trim();
  const unsigned = String(desktopDownloads.macosAppZipUrlUnsigned || "").trim();
  const primaryIsNotarized = Boolean(notarized && primary === notarized);
  const notPromoted =
    Boolean(notarized) &&
    ((unsigned && primary === unsigned) || (primary && primary !== notarized));
  const head = notarized ? await softHead(notarized) : { ok: false, status: 0 };
  let macNote: "none" | "unsigned-until-promote" | "ready-to-promote" = "none";
  if (notPromoted && !primaryIsNotarized) {
    macNote = head.ok ? "ready-to-promote" : "unsigned-until-promote";
  } else if (primary && !primaryIsNotarized) {
    // Unsigned ship: always surface Gatekeeper / SmartScreen guidance.
    macNote = "unsigned-until-promote";
  }
  return Response.json({
    ok: true,
    primaryIsNotarized,
    notPromoted,
    notarizedHeadOk: head.ok,
    notarizedHeadStatus: head.status,
    macNote,
    releaseTag: desktopDownloads.releaseTag || null
  });
}