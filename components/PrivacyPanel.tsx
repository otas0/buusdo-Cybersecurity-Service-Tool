"use client";

import { getMessages, type Locale } from "../i18n/messages";

export function PrivacyPanel({
  locale,
  onBack
}: {
  locale: Locale;
  onBack: () => void;
}) {
  const t = getMessages(locale);
  const pt = locale === "pt-PT";

  return (
    <main className="stage settings-stage" data-testid="privacy-policy">
      <p className="kicker">{t.navPrivacy}</p>
      <h2>{t.privacyPolicyTitle}</h2>
      <p className="light-note">{t.privacyPolicyIntro}</p>

      <section className="settings-block">
        <h3 className="settings-subhead">{t.privacyPolicyWhatTitle}</h3>
        <p className="hint">{t.privacyPolicyWhatBody}</p>
      </section>

      <section className="settings-block">
        <h3 className="settings-subhead">{t.privacyPolicyStoreTitle}</h3>
        <p className="hint">{t.privacyPolicyStoreBody}</p>
      </section>

      <section className="settings-block">
        <h3 className="settings-subhead">{t.privacyPolicyAccountTitle}</h3>
        <p className="hint">{t.privacyPolicyAccountBody}</p>
      </section>

      <section className="settings-block">
        <h3 className="settings-subhead">{t.privacyPolicyContactTitle}</h3>
        <p className="hint">{t.privacyPolicyContactBody}</p>
      </section>

      <p className="scope-note" data-testid="privacy-policy-updated">
        {t.privacyPolicyUpdated}
      </p>

      <div className="action-row settings-actions">
        <button type="button" className="text-button" onClick={onBack}>
          {t.back}
        </button>
        <a className="text-button" href={`/${pt ? "pt-PT" : "en"}/settings#settings-privacy`}>
          {t.navSettings}
        </a>
      </div>
    </main>
  );
}