"use client";

import { useEffect, useState } from "react";
import { getMessages, type Locale } from "../i18n/messages";
import { showsPartialPackBanner } from "../i18n/pack-coverage";
import { macMirrorUrl, resolveDesktopDownloads } from "../shared/desktop-downloads-resolve";

export function PrivacyPanel({
  locale,
  onBack,
  onOpenDesktopDownloads
}: {
  locale: Locale;
  onBack: () => void;
  /** SPA: Settings → #settings-desktop (scroll after client navigate). */
  onOpenDesktopDownloads?: () => void;
}) {
  const t = getMessages(locale);
  // Client resolve so Playwright stubs (__SHIELD_TEST_DESKTOP_DOWNLOADS__) win over SSR HTML.
  const [mirrorLive, setMirrorLive] = useState(false);
  const [releaseNotesUrl, setReleaseNotesUrl] = useState("#");
  useEffect(() => {
    const downloads = resolveDesktopDownloads();
    setMirrorLive(Boolean(macMirrorUrl(downloads)));
    setReleaseNotesUrl(String(downloads.releaseNotesUrl || "#"));
  }, []);

  // Hash scroll is owned by AppShell after view switch (avoids Settings → privacy race).

  return (
    <main className="stage settings-stage" data-testid="privacy-policy">
      <p className="kicker">{t.navPrivacy}</p>
      <h2>{t.privacyPolicyTitle}</h2>
      {showsPartialPackBanner(locale) ? (
        <p className="scope-note" role="status" data-testid="privacy-partial-pack-banner">
          {t.partialPackBanner}
        </p>
      ) : null}
      <p className="light-note">{t.privacyPolicyIntro}</p>

      <section className="settings-block">
        <h3 className="settings-subhead">{t.privacyPolicyWhatTitle}</h3>
        <p className="hint">{t.privacyPolicyWhatBody}</p>
      </section>

      <section className="settings-block">
        <h3 className="settings-subhead">{t.privacyPolicyStoreTitle}</h3>
        <p className="hint">{t.privacyPolicyStoreBody}</p>
      </section>

      <section className="settings-block" id="privacy-honest-limits">
        <h3 className="settings-subhead">{t.privacyPolicyLimitsTitle}</h3>
        <p className="hint" data-testid="privacy-honest-limits">
          {t.privacyPolicyLimitsBody}
        </p>
        {mirrorLive ? (
          <p className="scope-note">
            <a
              className="text-button"
              href={`/${locale}/settings#settings-desktop`}
              data-testid="privacy-desktop-mirror-note"
              onClick={(e) => {
                if (!onOpenDesktopDownloads) return;
                e.preventDefault();
                onOpenDesktopDownloads();
              }}
              onKeyDown={(e) => {
                if (!onOpenDesktopDownloads) return;
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                onOpenDesktopDownloads();
              }}
            >
              {t.privacyDesktopMirrorNote}
            </a>
          </p>
        ) : null}
      </section>

      <section className="settings-block">
        <h3 className="settings-subhead">{t.privacyPolicyAccountTitle}</h3>
        <p className="hint">{t.privacyPolicyAccountBody}</p>
      </section>

      <section className="settings-block" data-testid="privacy-contact" id="privacy-contact">
        <h3 className="settings-subhead">{t.privacyPolicyContactTitle}</h3>
        <p className="hint">{t.privacyPolicyContactBody}</p>
      </section>

      <section className="settings-block" data-testid="privacy-faq-parents" id="privacy-faq-parents">
        <h3 className="settings-subhead">{t.faqParentsTitle}</h3>
        <p className="hint">{t.faqParentsIntro}</p>
        <ul className="why-list">
          <li>
            <strong>{t.faqNoWipeTitle}</strong>
            <span>{t.faqNoWipeBody}</span>
          </li>
          <li>
            <strong>{t.faqNoAvTitle}</strong>
            <span>{t.faqNoAvBody}</span>
          </li>
          <li>
            <strong>{t.faqNoCrowdTitle}</strong>
            <span>{t.faqNoCrowdBody}</span>
          </li>
        </ul>
      </section>

      <p className="scope-note" data-testid="privacy-policy-updated">
        {t.privacyPolicyUpdated}
      </p>

      <p className="hint">
        <a className="text-button" href={`/${locale}/settings#settings-desktop`}>
          {t.desktopDownloadsTitle}
        </a>
        {" · "}
        <a
          className="text-button"
          href={releaseNotesUrl}
          target="_blank"
          rel="noreferrer"
          data-testid="privacy-desktop-release-notes"
        >
          {t.desktopDownloadRelease}
        </a>
      </p>

      <div className="action-row settings-actions">
        <button type="button" className="text-button" onClick={onBack}>
          {t.back}
        </button>
        <a className="text-button" href={`/${locale}/settings#settings-privacy`}>
          {t.navSettings}
        </a>
      </div>
    </main>
  );
}