// Node 22+/24 ESM requires import attributes for JSON (Playwright loads this module natively).
import desktopDownloads from "./desktop-downloads.json" with { type: "json" };

export type DesktopDownloads = typeof desktopDownloads;

declare global {
  interface Window {
    /** Playwright / local fixture override for Settings + Privacy download UI. */
    __SHIELD_TEST_DESKTOP_DOWNLOADS__?: DesktopDownloads;
  }
}

/** Runtime downloads JSON — production file, or Playwright stub via window. */
export function resolveDesktopDownloads(): DesktopDownloads {
  if (typeof window !== "undefined" && window.__SHIELD_TEST_DESKTOP_DOWNLOADS__) {
    return window.__SHIELD_TEST_DESKTOP_DOWNLOADS__;
  }
  return desktopDownloads;
}

export function macMirrorUrl(downloads: DesktopDownloads = resolveDesktopDownloads()): string {
  const mirrors =
    downloads.mirrors && typeof downloads.mirrors === "object"
      ? (downloads.mirrors as Record<string, string>)
      : {};
  return String(mirrors.macosAppZipUrl || "").trim();
}

/** Prefer CDN mirror when set, else GitHub primary. */
export function macDownloadUrl(downloads: DesktopDownloads = resolveDesktopDownloads()): string {
  const mirror = macMirrorUrl(downloads);
  if (mirror) return mirror;
  return String(downloads.macosAppZipUrl || "").trim();
}

export type TestDownloadsPatch = Partial<Omit<DesktopDownloads, "mirrors">> & {
  mirrors?: Partial<DesktopDownloads["mirrors"]>;
};

/**
 * Playwright fixtures only — merge a typed patch onto the repo downloads JSON
 * for `page.addInitScript(..., stub)` → `window.__SHIELD_TEST_DESKTOP_DOWNLOADS__`.
 */
export function withTestDownloads(patch: TestDownloadsPatch = {}): DesktopDownloads {
  const baseMirrors =
    desktopDownloads.mirrors && typeof desktopDownloads.mirrors === "object"
      ? { ...desktopDownloads.mirrors }
      : { windowsNsisUrl: "", macosAppZipUrl: "", linuxDebAmd64Url: "" };
  const { mirrors: mirrorPatch, ...rest } = patch;
  return {
    ...desktopDownloads,
    ...rest,
    mirrors: {
      ...baseMirrors,
      ...(mirrorPatch || {})
    }
  };
}

/** Drop the Playwright stub so `resolveDesktopDownloads()` uses the repo JSON. */
export function clearTestDownloads(): void {
  if (typeof window === "undefined") return;
  delete window.__SHIELD_TEST_DESKTOP_DOWNLOADS__;
}

/**
 * Self-contained init-script body for `page.addInitScript(clearTestDownloadsInit)`.
 * Must not close over module imports (Playwright serializes the function).
 */
export function clearTestDownloadsInit(): void {
  const w = globalThis as typeof globalThis & {
    __SHIELD_TEST_DESKTOP_DOWNLOADS__?: unknown;
  };
  delete w.__SHIELD_TEST_DESKTOP_DOWNLOADS__;
}