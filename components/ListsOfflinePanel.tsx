"use client";

import { getMessages, type Locale } from "../i18n/messages";

export function ListsOfflinePanel({
  locale,
  onBack,
  onOpenSettingsLists
}: {
  locale: Locale;
  onBack: () => void;
  onOpenSettingsLists?: () => void;
}) {
  const t = getMessages(locale);

  return (
    <main className="stage settings-stage" data-testid="lists-offline">
      <p className="kicker">{t.listsOfflineKicker}</p>
      <h2>{t.listsOfflineTitle}</h2>
      <p className="light-note">{t.listsOfflineIntro}</p>

      <section className="settings-block">
        <h3 className="settings-subhead">{t.listsOfflineStepsTitle}</h3>
        <ol className="hint" data-testid="lists-offline-steps">
          <li>{t.listsOfflineStepExport}</li>
          <li>{t.listsOfflineStepMove}</li>
          <li>{t.listsOfflineStepImport}</li>
        </ol>
      </section>

      <section className="settings-block">
        <h3 className="settings-subhead">{t.listsOfflineDesktopTitle}</h3>
        <p className="hint">{t.listsOfflineDesktopBody}</p>
      </section>

      <p className="hint">
        <a
          className="text-button"
          href="https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/blob/main/docs/OFFLINE_LIST_SYNC.md"
          target="_blank"
          rel="noreferrer"
          data-testid="lists-offline-docs"
        >
          {t.listsOfflineDocsLink}
        </a>
      </p>

      <div className="action-row settings-actions">
        <button type="button" className="text-button" onClick={onBack}>
          {t.back}
        </button>
        <a
          className="text-button"
          href={`/${locale}/settings#settings-block-lists`}
          data-testid="lists-offline-settings"
          onClick={(e) => {
            if (!onOpenSettingsLists) return;
            e.preventDefault();
            onOpenSettingsLists();
          }}
        >
          {t.navSettings}
        </a>
      </div>
    </main>
  );
}
