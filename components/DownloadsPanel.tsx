"use client";

import { useEffect, useState } from "react";
import type { Locale } from "../i18n/messages";
import { getMessages } from "../i18n/messages";
import extensionStores from "../shared/extension-stores.json" with { type: "json" };
import desktopDownloads from "../shared/desktop-downloads.json" with { type: "json" };
import {
  macDownloadUrl,
  macMirrorUrl,
  resolveDesktopDownloads
} from "../shared/desktop-downloads-resolve";

const CHROME_STORE_URL = String(extensionStores.chromeWebStoreUrl || "").trim();
const SAFARI_STORE_URL = String(extensionStores.safariAppStoreUrl || "").trim();
const STORE_DOCS_URL =
  "https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/blob/main/docs/EXTENSION_STORE_DISTRIBUTE.md";
const EXT_SETUP_DOCS_URL =
  "https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/blob/main/docs/EXTENSION_CHROME_SAFARI.md";
const DESKTOP_MIRRORS =
  desktopDownloads.mirrors && typeof desktopDownloads.mirrors === "object"
    ? (desktopDownloads.mirrors as Record<string, string>)
    : {};

function desktopUrl(primary: string, mirrorKey: string) {
  const mirror = String(DESKTOP_MIRRORS[mirrorKey] || "").trim();
  return mirror || String(primary || "").trim();
}

const DESKTOP_WIN_URL = desktopUrl(desktopDownloads.windowsNsisUrl, "windowsNsisUrl");
const DESKTOP_MAC_URL = desktopUrl(desktopDownloads.macosAppZipUrl, "macosAppZipUrl");
const DESKTOP_LINUX_URL = desktopUrl(desktopDownloads.linuxDebAmd64Url, "linuxDebAmd64Url");
const DESKTOP_PACKAGING_URL = String(desktopDownloads.packagingDocsUrl || STORE_DOCS_URL).trim();
const DESKTOP_SETUP_GUIDE_URL = String(desktopDownloads.setupGuideUrl || DESKTOP_PACKAGING_URL).trim();
const DESKTOP_RELEASE_URL = String(desktopDownloads.releaseNotesUrl || DESKTOP_PACKAGING_URL).trim();
const DESKTOP_RELEASE_TAG = String(desktopDownloads.releaseTag || "").trim();

export function DownloadsPanel({
  locale,
  onBack,
  onOpenHonestLimits
}: {
  locale: Locale;
  onBack: () => void;
  onOpenHonestLimits?: () => void;
}) {
  const t = getMessages(locale);
  const enMsg = getMessages("en");
  const ptMsg = getMessages("pt-PT");
  const cdnCopyDiverges =
    enMsg.privacyDesktopMirrorNote !== ptMsg.privacyDesktopMirrorNote ||
    enMsg.desktopDownloadSourceCdn !== ptMsg.desktopDownloadSourceCdn ||
    enMsg.desktopDownloadMacSource !== ptMsg.desktopDownloadMacSource;
  const [showMacSource, setShowMacSource] = useState(false);
  const [macHref, setMacHref] = useState(DESKTOP_MAC_URL);
  const [macPromoteNote, setMacPromoteNote] = useState<
    "none" | "unsigned-until-promote" | "ready-to-promote"
  >("none");
  const macCdnDesc =
    showMacSource && macHref
      ? cdnCopyDiverges
        ? t.desktopDownloadMacSource.replace(
            "{source}",
            `${t.desktopDownloadSourceCdn} — ${macHref}`
          )
        : macHref
      : "";

  useEffect(() => {
    const downloads = resolveDesktopDownloads();
    setShowMacSource(Boolean(macMirrorUrl(downloads)));
    setMacHref(macDownloadUrl(downloads) || DESKTOP_MAC_URL);
    const primary = String(downloads.macosAppZipUrl || "").trim();
    const notarized = String(downloads.macosAppZipUrlNotarized || "").trim();
    const unsigned = String(downloads.macosAppZipUrlUnsigned || "").trim();
    const primaryIsNotarized = Boolean(notarized && primary === notarized);
    const notPromoted =
      Boolean(notarized) &&
      ((unsigned && primary === unsigned) || (primary && primary !== notarized));
    setMacPromoteNote(primary && !primaryIsNotarized ? "unsigned-until-promote" : "none");
    let cancelled = false;
    void fetch("/api/desktop-downloads/status")
      .then((r) => r.json())
      .then((raw: unknown) => {
        if (cancelled) return;
        const data =
          raw && typeof raw === "object" ? (raw as { macNote?: string }) : null;
        if (data?.macNote === "ready-to-promote" || data?.macNote === "unsigned-until-promote") {
          setMacPromoteNote(data.macNote);
        } else if (!(primary && !primaryIsNotarized) && !notPromoted) {
          setMacPromoteNote("none");
        }
      })
      .catch(() => {
        /* keep static note */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="stage settings-stage" data-testid="downloads-page">
      <p className="kicker">{t.navDownloads}</p>
      <h2>{t.navDownloads}</h2>
      <p className="light-note">{t.desktopDownloadsIntro}</p>

      <section
        className="settings-block"
        id="settings-desktop"
        data-testid="settings-desktop-downloads"
        aria-labelledby="settings-desktop-heading"
      >
        <h3 id="settings-desktop-heading" className="settings-subhead">
          {t.desktopDownloadsTitle}
        </h3>
        <p className="hint">{t.desktopDownloadsIntro}</p>
        <p className="hint" style={{ marginBottom: "0.35rem" }}>
          <strong>{t.desktopInstallStepsTitle}</strong>
        </p>
        <ol className="hint" data-testid="downloads-desktop-install-steps" style={{ margin: "0 0 0.75rem" }}>
          <li>{t.desktopInstallStep1}</li>
          <li>{t.desktopInstallStep2}</li>
          <li>{t.desktopInstallStep3}</li>
        </ol>
        <p className="hint" data-testid="settings-desktop-download-row">
          <a
            className="text-button"
            href={DESKTOP_WIN_URL || DESKTOP_PACKAGING_URL}
            target="_blank"
            rel="noreferrer"
          >
            {DESKTOP_WIN_URL
              ? t.desktopDownloadWindows
              : `${t.desktopDownloadWindows} — ${t.desktopDownloadSoon}`}
          </a>
          {" · "}
          <a
            className="text-button"
            href={macHref || DESKTOP_PACKAGING_URL}
            target="_blank"
            rel="noreferrer"
            data-testid="settings-desktop-download-mac"
            aria-describedby={macCdnDesc ? "settings-desktop-mac-cdn-desc" : undefined}
          >
            {macHref
              ? t.desktopDownloadMac
              : `${t.desktopDownloadMac} — ${t.desktopDownloadSoon}`}
          </a>
          {macCdnDesc ? (
            <span
              id="settings-desktop-mac-cdn-desc"
              data-testid="settings-desktop-mac-cdn-desc"
              className="visually-hidden"
            >
              {macCdnDesc}
            </span>
          ) : null}
          {macPromoteNote !== "none" ? (
            <span
              className="hint"
              data-testid={
                macPromoteNote === "ready-to-promote"
                  ? "settings-desktop-mac-ready-to-promote"
                  : "settings-desktop-mac-unsigned-note"
              }
              style={{ display: "block", marginTop: "0.35rem" }}
            >
              {macPromoteNote === "ready-to-promote"
                ? t.desktopDownloadReadyToPromote
                : t.desktopDownloadUnsignedUntilPromote}
            </span>
          ) : null}
          {" · "}
          <a
            className="text-button"
            href={DESKTOP_LINUX_URL || DESKTOP_PACKAGING_URL}
            target="_blank"
            rel="noreferrer"
          >
            {DESKTOP_LINUX_URL
              ? t.desktopDownloadLinux
              : `${t.desktopDownloadLinux} — ${t.desktopDownloadSoon}`}
          </a>
        </p>
        {DESKTOP_RELEASE_TAG ? (
          <p className="scope-note" data-testid="settings-desktop-release-tag">
            {t.desktopDownloadReleaseTag.replace("{tag}", DESKTOP_RELEASE_TAG)}
          </p>
        ) : null}
        {showMacSource ? (
          <p
            className="scope-note"
            data-testid="settings-desktop-mac-source"
            title={macCdnDesc || undefined}
          >
            {t.desktopDownloadMacSource.replace(
              "{source}",
              `${t.desktopDownloadSourceCdn} · ${t.desktopDownloadSourceGithub}`
            )}
          </p>
        ) : null}
        <p className="hint">
          <a
            className="text-button"
            href={DESKTOP_SETUP_GUIDE_URL}
            target="_blank"
            rel="noreferrer"
            data-testid="settings-desktop-setup-guide"
          >
            {t.desktopDownloadSetupGuide}
          </a>
          {" · "}
          <a className="text-button" href={DESKTOP_PACKAGING_URL} target="_blank" rel="noreferrer">
            {t.desktopDownloadPackaging}
          </a>
          {" · "}
          <a className="text-button" href={DESKTOP_RELEASE_URL} target="_blank" rel="noreferrer">
            {t.desktopDownloadRelease}
          </a>
          {" · "}
          <a className="text-button" href={DESKTOP_PACKAGING_URL} target="_blank" rel="noreferrer">
            {t.blockListsInstallDesktop}
          </a>
          {" · "}
          <a
            className="text-button"
            href={`/${locale}/privacy#privacy-honest-limits`}
            data-testid="settings-desktop-honest-limits"
            onClick={(e) => {
              if (!onOpenHonestLimits) return;
              e.preventDefault();
              onOpenHonestLimits();
            }}
          >
            {t.desktopHonestLimitsLink}
          </a>
        </p>
      </section>

      <section
        className="settings-block"
        id="downloads-extension"
        data-testid="downloads-extension"
        aria-labelledby="downloads-extension-heading"
        style={{ scrollMarginTop: "var(--shell-top-scroll-margin)" }}
      >
        <h3 id="downloads-extension-heading" className="settings-subhead">
          {t.blockListsInstallExt}
        </h3>
        <p className="hint">{t.blockOnSurfaces}</p>
        <p className="hint" data-testid="downloads-extension-store-only">
          {t.extensionStoreOnlyNote}
        </p>
        <p className="hint" data-testid="downloads-extension-row">
          <a
            className="text-button"
            href={CHROME_STORE_URL || STORE_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            data-testid="downloads-get-chrome"
          >
            {CHROME_STORE_URL ? t.blockListsGetChrome : t.blockListsChromeListingSoon}
          </a>
          {" · "}
          <a
            className="text-button"
            href={SAFARI_STORE_URL || STORE_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            data-testid="downloads-get-safari"
          >
            {SAFARI_STORE_URL ? t.blockListsGetSafari : t.blockListsSafariListingSoon}
          </a>
          {" · "}
          <a
            className="text-button"
            href={EXT_SETUP_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            data-testid="downloads-extension-setup"
          >
            {t.blockListsInstallChromeSafari}
          </a>
        </p>
      </section>

      <div className="action-row settings-actions">
        <button type="button" className="text-button" onClick={onBack}>
          {t.back}
        </button>
        <a className="text-button" href={`/${locale}/settings`} data-testid="downloads-settings-link">
          {t.navSettings}
        </a>
      </div>
    </main>
  );
}
