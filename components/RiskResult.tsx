"use client";

import { useEffect, useState } from "react";
import type { Analysis } from "../security/analyse";
import { probeBlockedPair } from "../security/probe-blocked-copy";
import { canPersistLists } from "./privacy-storage";
import { listFeedbackDrafts, saveFeedbackDraft, type FeedbackMark } from "./feedback-drafts";
import { CopyEnvLine } from "./CopyEnvLine";
import {
  formatHaltTimingChip,
  formatTimingFlagChips,
  formatTimingSummaryLine,
  timingLabels
} from "./timing-copy";
import { levelToLight, TrafficLights } from "./TrafficLights";
import type { Locale, MessageBag } from "../i18n/messages";
import {
  evidencePairFromBag,
  recommendationCopy,
  riskLevelCopy
} from "./risk-evidence-copy";
import { riskWhyItems, whyEvidenceDisplay } from "./risk-why-items";

export function RiskResult({
  analysis,
  t,
  locale = "en",
  onReset
}: {
  analysis: Analysis;
  t: MessageBag | Record<string, string>;
  locale?: Locale;
  onReset: () => void;
}) {
  const bag = t as MessageBag;
  const { parsed, risk, identity, threat, sensitive, live } = analysis;
  const [feedbackNote, setFeedbackNote] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [draftMarks, setDraftMarks] = useState<FeedbackMark[]>([]);
  const [desktopBlockNote, setDesktopBlockNote] = useState("");
  const feedbackHost = parsed.hostname.toLowerCase().replace(/\.$/, "");

  async function openDesktopBlock() {
    setDesktopBlockNote("");
    const deep = `http://127.0.0.1:3010/?blockHost=${encodeURIComponent(feedbackHost)}#listsSection`;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 1500);
      const res = await fetch("http://127.0.0.1:3010/api/state", {
        method: "GET",
        signal: ctrl.signal,
        mode: "cors"
      }).catch(() => null);
      clearTimeout(timer);
      if (!res || !res.ok) {
        setDesktopBlockNote(bag.desktopBlockNeedOpen);
        return;
      }
      window.open(deep, "_blank", "noopener,noreferrer");
    } catch {
      setDesktopBlockNote(bag.desktopBlockNeedOpen);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      const marks = listFeedbackDrafts()
        .filter((item) => item.domain === feedbackHost)
        .map((item) => item.mark);
      setDraftMarks(marks);
    }, 0);
    return () => clearTimeout(timer);
  }, [feedbackHost]);

  function saveFeedback(mark: FeedbackMark) {
    const result = saveFeedbackDraft({ domain: feedbackHost, level: risk.level, mark });
    if (!result.persisted) {
      setFeedbackNote(t.feedbackNeedLocal);
      return;
    }
    setDraftMarks(result.drafts.filter((item) => item.domain === feedbackHost).map((item) => item.mark));
    setFeedbackNote(mark === "report" ? t.feedbackReportExportHint : t.feedbackSaved);
  }

  function openSettingsData() {
    if (typeof window !== "undefined") {
      window.location.assign(`/${locale}/settings#settings-privacy`);
    }
  }

  function openSettingsFeedback() {
    if (typeof window !== "undefined") {
      window.location.assign(`/${locale}/settings#settings-feedback-drafts`);
    }
  }

  const evidenceVars = {
    org: identity.claimedOrganisation?.name ?? "",
    domain: parsed.registrableDomain
  };
  function evidenceTranslated(id: string): [string, string] | undefined {
    return evidencePairFromBag(bag, id, evidenceVars);
  }
  function probeBlockedTranslated(item: { id: string; detail: string }): [string, string] | undefined {
    return probeBlockedPair(item, {
      liveStatusCode: live?.statusCode,
      locale
    });
  }
  const copy =
    riskLevelCopy(bag, risk.level) ??
    ({ label: risk.level, note: "" } as { label: string; note: string });
  const official = identity.claimedOrganisation?.domains[0];
  const confidenceLabel =
    ({ HIGH: bag.confidenceHigh, MODERATE: bag.confidenceModerate, LIMITED: bag.confidenceLimited }[
      risk.confidence as "HIGH" | "MODERATE" | "LIMITED"
    ] ?? risk.confidence);
  const reputationLabel =
    ({
      KNOWN_MALICIOUS: bag.reputationKnownMalicious,
      KNOWN_PHISHING: bag.reputationKnownPhishing,
      NO_KNOWN_MATCH: bag.reputationNoKnownMatch,
      UNKNOWN: bag.reputationUnknown,
      PROVIDER_UNAVAILABLE: bag.reputationProviderUnavailable
    }[threat.state] ?? threat.state.replaceAll("_", " "));
  const sensitiveLabel = sensitive
    ? ({
        password: bag.sensitivePassword,
        payment: bag.sensitivePayment,
        personal: bag.sensitivePersonal,
        permission: bag.sensitivePermission
      }[sensitive] ?? sensitive)
    : bag.detailSensitiveNone || "None";
  const recommendation = recommendationCopy(bag, risk.recommendation);

  const kindLabel = (kind: string) => {
    const map: Record<string, string> = {
      known: bag.kindKnown,
      likely: bag.kindLikely,
      signal: bag.kindSignal,
      unknown: bag.kindUnknown,
      limitation: bag.kindLimitation
    };
    return map[kind] || kind;
  };

  const userBlockEv = risk.evidence.find((item) => item.id === "user-block");
  const userBlockPair = userBlockEv ? evidenceTranslated("user-block") : undefined;
  const userBlockTitle = userBlockEv ? userBlockPair?.[0] ?? userBlockEv.title : null;
  const whyItems = riskWhyItems(risk.evidence, { bannerShowsUserBlock: Boolean(userBlockTitle) });
  const limitations = [
    bag.limitationFalsePosNeg,
    bag.limitationNoContent,
    bag.limitationIdentityNotSafe,
    bag.limitationNoThirdParty
  ].filter((s) => Boolean(s?.trim()));
  const detailRows: Array<{ kind: string; display: string; meta?: string }> = [
    { kind: bag.detailKindDomain, display: parsed.registrableDomain },
    { kind: bag.detailKindReputation, display: reputationLabel },
    { kind: bag.detailKindRequest, display: sensitiveLabel },
    { kind: bag.detailKindEvidence, display: confidenceLabel },
    { kind: bag.detailKindSource, display: threat.providerName },
    ...risk.evidence.map((item) => {
      const translated =
        item.id === "probe-blocked" ? probeBlockedTranslated(item) : evidenceTranslated(item.id);
      return { kind: kindLabel(item.kind), display: translated?.[0] ?? item.title, meta: translated?.[1] ?? item.detail };
    }),
    { kind: "URL", display: parsed.fullUrl },
    {
      kind: bag.detailKindProtocol,
      display: `${parsed.protocol.toUpperCase()} ${
        parsed.usesHttps ? bag.protocolEncrypted : bag.protocolUnencrypted
      }`
    },
    { kind: "Hostname", display: parsed.hostname },
    ...(parsed.subdomain ? [{ kind: bag.detailKindSubdomain, display: parsed.subdomain }] : []),
    ...(parsed.hasPunycode ? [{ kind: "Punycode", display: parsed.hostname }] : []),
    ...(live?.redirectChain?.length
      ? [{ kind: bag.detailKindRedirects, display: live.redirectChain.join(" → ") }]
      : []),
    ...(analysis.timing
      ? [
          {
            kind: bag.detailKindTiming,
            display: formatTimingSummaryLine(analysis.timing, timingLabels(t))
          }
        ]
      : []),
    ...limitations.map((item) => ({ kind: bag.detailKindLimit, display: item }))
  ];

  const showIgnoreRisk = risk.level === "CRITICAL" || risk.level === "HIGH";
  const showNextSteps =
    risk.recommendation === "LEAVE" ||
    risk.recommendation === "LEAVE_AND_BLOCK" ||
    risk.recommendation === "VERIFY_INDEPENDENTLY" ||
    risk.level === "CRITICAL" ||
    risk.level === "HIGH" ||
    risk.level === "CAUTION";
  const showHaltReport =
    risk.level === "CRITICAL" || risk.level === "HIGH" || risk.level === "CAUTION";

  return (
    <div className="result-layout" aria-live="polite">
      <TrafficLights level={levelToLight(risk.level)} standby={t.lightStandby} safe={t.lightSafe} caution={t.lightCaution} danger={t.lightDanger} />
      <p className="result-verdict">{copy.label}</p>
      <p className="result-danger-level" data-testid="result-danger-level">
        <span className="danger-level-label">{t.dangerLevelLabel}</span>
        {": "}
        <strong>{copy.label}</strong>
      </p>
      <p className="light-note">{levelToLight(risk.level) === "safe" ? t.lightLimited : copy.note}</p>

      {showIgnoreRisk ? (
        <section className="result-ignore-risk halt-accent" data-testid="result-ignore-risk" aria-label={t.ignoreRiskTitle}>
          <p className="kicker">{t.ignoreRiskTitle}</p>
          <p>{t.ignoreRiskBody}</p>
        </section>
      ) : null}

      <section className="result-why">
        <p className="kicker">{t.whyTitle}</p>
        {userBlockTitle && (
          <p className="scope-note halt-accent" data-testid="user-block-evidence">
            <strong>{userBlockTitle}</strong>
            {" — "}
            {userBlockPair?.[1] ?? userBlockEv?.detail}
          </p>
        )}
        <ul className="why-list">
          {whyItems.length === 0 ? (
            <li>{bag.whyEmpty}</li>
          ) : (
            whyItems.map((item) => {
              const full = risk.evidence.find((e) => e.id === item.id);
              if (!full) {
                return (
                  <li key={item.id}>
                    <strong>{item.id}</strong>
                    <span />
                  </li>
                );
              }
              // probe-blocked: same probeBlockedPair path as detail rows (via whyEvidenceDisplay).
              if (full.id === "probe-blocked") {
                const display = whyEvidenceDisplay(full, {
                  liveStatusCode: live?.statusCode,
                  locale
                });
                return (
                  <li key={item.id}>
                    <strong>{display.title}</strong>
                    <span>{display.detail}</span>
                  </li>
                );
              }
              const translated = evidenceTranslated(full.id);
              return (
                <li key={item.id}>
                  <strong>{translated?.[0] ?? full.title ?? item.id}</strong>
                  <span>{translated?.[1] ?? full.detail ?? ""}</span>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section className="log-action">
        <p className="kicker">{t.actions}</p>
        <h2>{recommendation}</h2>
        <p>{t.actionSensitiveNote}</p>
        {showNextSteps ? (
          <div className="result-next-steps" data-testid="result-next-steps">
            <p className="kicker">{t.nextStepsTitle}</p>
            <ol className="next-steps-list">
              <li>{t.nextStepLeave}</li>
              <li>{t.nextStepNoCredentials}</li>
              <li>{t.nextStepVerifyOfficial}</li>
              {(risk.recommendation === "LEAVE_AND_BLOCK" ||
                risk.level === "CRITICAL" ||
                risk.level === "HIGH") && <li>{t.nextStepBlock}</li>}
              <li>{t.nextStepReport}</li>
              <li>{t.nextStepLooksReal}</li>
            </ol>
          </div>
        ) : null}
        {risk.recommendation === "LEAVE" &&
          risk.level === "LOW_EVIDENCE" &&
          Boolean(userBlockEv) && (
            <p
              id="personal-list-leave-note"
              className="scope-note personal-list-leave-note halt-accent"
              data-testid="personal-list-leave-note"
            >
              {t.personalListLeaveNote}
            </p>
          )}
        {/* Reading order: describe Leave before the action row (aria-describedby). */}
        {analysis.timing?.ambiguousProbeStatus ? (
          <p
            className="scope-note"
            data-testid="ambiguous-probe-not-phishing"
            id="ambiguous-probe-not-phishing"
          >
            {t.ambiguousProbeNotPhishing}
          </p>
        ) : null}
        {/* Leave must stay a direct child of result-action-row (Playwright locator). */}
        <div className="action-row" data-testid="result-action-row">
          <button
            className="primary-button"
            type="button"
            onClick={onReset}
            {...(() => {
              const ids: string[] = [];
              if (
                risk.recommendation === "LEAVE" &&
                risk.level === "LOW_EVIDENCE" &&
                Boolean(userBlockEv)
              ) {
                ids.push("personal-list-leave-note");
              }
              if (analysis.timing?.ambiguousProbeStatus) {
                ids.push("ambiguous-probe-not-phishing");
              }
              return ids.length ? { "aria-describedby": ids.join(" ") } : {};
            })()}
          >
            {t.leave}
          </button>
          {showHaltReport ? (
            <button
              type="button"
              className="text-button"
              data-testid="result-report-website"
              disabled={draftMarks.includes("report")}
              onClick={() => saveFeedback("report")}
            >
              {draftMarks.includes("report") ? t.feedbackAlready : t.feedbackReportHaltCta}
            </button>
          ) : null}
          {(risk.recommendation === "LEAVE_AND_BLOCK" ||
            risk.level === "CRITICAL" ||
            risk.level === "HIGH") && (
            <>
              <button
                type="button"
                className="text-button"
                data-testid="add-desktop-block"
                onClick={() => void openDesktopBlock()}
              >
                {bag.desktopBlockCta}
              </button>
              {desktopBlockNote ? (
                <p className="hint" data-testid="desktop-block-need-app" role="status">
                  {desktopBlockNote}
                </p>
              ) : null}
            </>
          )}
          {/* Hold (CAUTION) or Clear with 403/429/503: surface ambiguousProbeStatus next to Leave. */}
          {analysis.timing?.ambiguousProbeStatus ? (
            <span
              className="timing-flag-chip is-on"
              data-testid="leave-ambiguous-probe-chip"
              data-flag="ambiguousProbeStatus"
              data-on="1"
              title={timingLabels(t).timingAmbiguousProbe}
            >
              {timingLabels(t).timingAmbiguousProbe}
            </span>
          ) : null}
          {showIgnoreRisk && analysis.timing?.totalMs != null ? (
            (() => {
              const chip = formatHaltTimingChip(analysis.timing.totalMs, timingLabels(t));
              return (
                <span
                  className="timing-flag-chip is-on"
                  data-testid="halt-timing-chip"
                  data-flag="totalMs"
                  data-on="1"
                  title={chip.ariaLabel}
                  aria-label={chip.ariaLabel}
                >
                  {chip.text}
                </span>
              );
            })()
          ) : null}
          {official && <a className="text-button" href={`https://${official}`} target="_blank" rel="noreferrer">{t.verified}</a>}
          {risk.recommendation === "LEAVE_AND_BLOCK" && (
            <a
              className="text-button"
              data-testid="leave-and-block-settings"
              href={`/${locale}/settings#settings-block-lists`}
            >
              {t.leaveAndBlockSettingsCta}
            </a>
          )}
        </div>
        <p className="scope-note">
          {t.blockOnSurfaces}{" "}
          <a
            className="text-button"
            data-testid="result-block-lists-settings"
            href={`/${locale}/settings#settings-block-lists`}
          >
            {t.blockListsSettingsLink}
          </a>
        </p>
        <section className="result-honest-limits" data-testid="result-honest-limits" aria-label={t.honestLimitsTitle}>
          <p className="kicker">{t.honestLimitsTitle}</p>
          <ul className="honest-limits-list">
            <li>{t.honestLimitNoWipe}</li>
            <li>{t.honestLimitNoCrowd}</li>
            <li>{t.honestLimitNoAv}</li>
          </ul>
        </section>
      </section>

      <section className="result-details">
        <button type="button" className="text-button details-toggle" onClick={() => setShowDetails((v) => !v)} aria-expanded={showDetails}>
          {showDetails ? t.hideDetails : t.showDetails}
        </button>
        {showDetails && (
          <>
            {analysis.timing && (
              <>
                <CopyEnvLine
                  locale={locale}
                  envLine={formatTimingSummaryLine(analysis.timing, timingLabels(t))}
                  label={t.timingCopySummary}
                  copiedLabel={t.timingCopied}
                />
                <p className="check-timing-flags" data-testid="timing-flag-chips" aria-label={t.timingFlagsLabel || "Timing flags"}>
                  {formatTimingFlagChips(analysis.timing, timingLabels(t)).map((chip) => (
                    <span
                      key={chip.id}
                      className={`timing-flag-chip${chip.on ? " is-on" : ""}`}
                      data-flag={chip.id}
                      data-on={chip.on ? "1" : "0"}
                    >
                      {chip.text}
                    </span>
                  ))}
                </p>
              </>
            )}
            <ul className="block-log">
              {detailRows.map((row) => (
                <li key={`${row.kind}-${row.display}`}>
                  <span className="kind">{row.kind}</span>
                  <span className="display">{row.display}</span>
                  {row.meta && <span className="meta">{row.meta}</span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="feedback-panel" aria-label={t.feedbackPrompt}>
        <p className="kicker">{t.feedbackPrompt}</p>
        <p className="hint">{t.feedbackHint}</p>
        <div className="action-row">
          <button
            type="button"
            className="text-button"
            disabled={draftMarks.includes("report")}
            onClick={() => saveFeedback("report")}
          >
            {draftMarks.includes("report") ? t.feedbackAlready : t.feedbackReport}
          </button>
          <button
            type="button"
            className="text-button"
            disabled={draftMarks.includes("false-positive")}
            onClick={() => saveFeedback("false-positive")}
          >
            {draftMarks.includes("false-positive") ? t.feedbackAlready : t.feedbackFalsePositive}
          </button>
        </div>
        {feedbackNote && (
          <p className="scope-note" role="status" data-testid="feedback-note">
            {feedbackNote}{" "}
            {feedbackNote === t.feedbackReportExportHint ? (
              <button type="button" className="text-button" onClick={openSettingsFeedback}>
                {t.feedbackReportExportSettings}
              </button>
            ) : null}
            {!canPersistLists() && feedbackNote !== t.feedbackReportExportHint && (
              <button type="button" className="text-button" onClick={openSettingsData}>
                {t.feedbackOpenSettings}
              </button>
            )}
          </p>
        )}
      </section>
    </div>
  );
}