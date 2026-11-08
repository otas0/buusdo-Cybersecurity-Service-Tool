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
import type { Locale } from "../i18n/messages";
import { riskWhyItems, whyEvidenceDisplay } from "./risk-why-items";

export function RiskResult({ analysis, t, onReset }: { analysis: Analysis; t: Record<string, string>; onReset: () => void }) {
  const { parsed, risk, identity, threat, sensitive, live } = analysis;
  const [feedbackNote, setFeedbackNote] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [draftMarks, setDraftMarks] = useState<FeedbackMark[]>([]);
  const [desktopBlockNote, setDesktopBlockNote] = useState("");
  const pt = t.navCheck === "Verificar";
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
        setDesktopBlockNote(
          pt
            ? "Abra primeiro o desktop buusdo (localhost:3010), depois tente de novo."
            : "Open the buusdo desktop app first (localhost:3010), then try again."
        );
        return;
      }
      window.open(deep, "_blank", "noopener,noreferrer");
    } catch {
      setDesktopBlockNote(
        pt
          ? "Abra primeiro o desktop buusdo (localhost:3010), depois tente de novo."
          : "Open the buusdo desktop app first (localhost:3010), then try again."
      );
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
    const locale = pt ? "pt-PT" : "en";
    if (typeof window !== "undefined") {
      window.location.assign(`/${locale}/settings#settings-privacy`);
    }
  }

  function openSettingsFeedback() {
    const locale = pt ? "pt-PT" : "en";
    if (typeof window !== "undefined") {
      window.location.assign(`/${locale}/settings#settings-feedback-drafts`);
    }
  }

  const levelCopy: Record<string, { label: string; note: string }> = pt ? {
    CRITICAL: { label: "Risco crítico", note: "Há provas fortes de que deve sair antes de introduzir informação." },
    HIGH: { label: "Risco elevado", note: "Vários sinais documentados exigem atenção imediata." },
    CAUTION: { label: "Cuidado", note: "Foram encontrados sinais de alerta ou incerteza importantes." },
    LOW_EVIDENCE: { label: "Provas de risco limitadas", note: "Não foi encontrada nenhuma ameaça conhecida nas fontes verificadas." },
    UNKNOWN: { label: "Desconhecido", note: "Não existem provas suficientes para uma conclusão segura." },
  } : {
    CRITICAL: { label: "Critical risk", note: "Strong evidence indicates that you should leave before entering information." },
    HIGH: { label: "High risk", note: "Multiple documented warning signals need immediate attention." },
    CAUTION: { label: "Caution", note: "Important uncertainty or warning signals were found." },
    LOW_EVIDENCE: { label: "Limited risk evidence", note: "No known threat was found in the sources checked." },
    UNKNOWN: { label: "Unknown", note: "There is not enough evidence to reach a confident conclusion." },
  };

  const evidencePt: Record<string, [string, string]> = {
    "known-threat": ["Sinal de ameaça conhecido", "Este endereço correspondeu à lista própria do buusdo."],
    "no-match": ["Nenhuma ameaça conhecida nas listas", "Não foi encontrada nenhuma ameaça conhecida na lista própria. Isto não prova que o site seja seguro."],
    "unknown-reputation": ["Reputação desconhecida", "A lista própria não fornece um resultado positivo nem negativo."],
    "provider-unavailable": ["Lista de ameaças indisponível", "A lista própria não pôde ser lida. As verificações estruturais e em direto continuaram."],
    "identity-match": ["O domínio corresponde a uma organização conhecida", `O domínio registável corresponde a ${identity.claimedOrganisation?.name}. Isto não significa que o site seja seguro.`],
    "identity-mismatch": ["Parece uma organização conhecida, mas o domínio não corresponde", `O endereço parece relacionado com ${identity.claimedOrganisation?.name}, mas o domínio de controlo é ${parsed.registrableDomain}.`],
    "misleading-subdomain": ["Sinal de subdomínio enganador", `Um nome parecido com uma organização aparece antes do domínio de controlo ${parsed.registrableDomain}.`],
    lookalike: ["Sinal de semelhança do domínio", "Este domínio parece-se com um domínio conhecido. A semelhança é um sinal, não prova de phishing."],
    punycode: ["Domínio internacionalizado codificado", "O endereço contém punycode. Pode ser legítimo, mas caracteres visualmente confusos exigem cuidado."],
    http: ["Ligação não encriptada", "A informação enviada por HTTP pode ficar exposta durante a transmissão."],
    "sensitive-path": ["Caminho de página sensível", "O caminho sugere que a página pode pedir informação sensível. Confirme o domínio de forma independente."],
    sensitive: ["Caminho de página sensível", "O caminho sugere que a página pode pedir informação sensível. Confirme o domínio de forma independente."],
    "checked-address": ["Endereço analisado", `Verificado ${parsed.registrableDomain}.`],
    "dns-ok": ["Anfitrião acessível", "A verificação em direto alcançou o anfitrião."],
    "dns-fail": ["O anfitrião não foi alcançado", "O anfitrião não respondeu. O site pode estar mal escrito ou inacessível."],
    "http-status": ["O site respondeu", "Foi recebida uma resposta HTTP."],
    "redirect-chain": ["Cadeia de redirecionamentos", "O pedido seguiu um ou mais redirecionamentos."],
    "cross-redirect": ["Redirecionamento para outro domínio", "O endereço redirecionou para outro domínio registável."],
    redirect: ["O endereço redireciona", "O pedido seguiu um redirecionamento."],
    unreachable: ["O site não respondeu", "O pedido em direto falhou."],
    "tls-fail": ["Problema de TLS / certificado", "O HTTPS não pôde ser validado. Não introduza informação sensível."],
    "ip-host": ["Endereço numérico", "O site é acedido por IP em vez de um nome de domínio normal."],
    "risky-tld": ["Terminação de domínio pouco comum", "Esta terminação é mais usada em campanhas de phishing. Por si só não prova dano."],
    "deep-subdomain": ["Cadeia de subdomínios invulgar", "Subdomínios longos às vezes são usados para parecer oficiais."],
    "secret-query": ["Segredo no link", "O endereço coloca um segredo na query. O valor não foi guardado."],
    "probe-timeout": ["A verificação em direto expirou", "O site não respondeu a tempo."],
    "https-limit": ["HTTPS não prova identidade ou confiança", "HTTPS protege a ligação, mas não prova a identidade ou a fiabilidade do site."],
    "scope-limit": ["Âmbito desta verificação", "Analisamos o endereço com a lista própria, marcas parecidas, DNS, acessibilidade e redirecionamentos. Não enviamos o URL a serviços de terceiros."],
    "user-block": [
      "Lista pessoal de bloqueio",
      "Este anfitrião está na sua lista pessoal (extensão ou app). O site não guardou a lista."
    ],
  };
  const locale = pt ? "pt-PT" : "en";
  function probeBlockedTranslated(item: { id: string; detail: string }): [string, string] | undefined {
    return probeBlockedPair(item, {
      liveStatusCode: live?.statusCode,
      locale
    });
  }
  const limitationsPt = [
    "Os sinais podem produzir falsos positivos ou falsos negativos.",
    "Esta verificação não analisa o conteúdo do site nem prova quem controla um domínio.",
    "Uma correspondência de identidade não garante que todas as ações de um site sejam seguras.",
    "URLs não são enviados a Google Safe Browsing nem a outros serviços de reputação de terceiros.",
  ];
  const copy = levelCopy[risk.level];
  const official = identity.claimedOrganisation?.domains[0];
  const confidenceLabel = pt ? ({ HIGH: "ALTA", MODERATE: "MODERADA", LIMITED: "LIMITADA" }[risk.confidence]) : risk.confidence;
  const reputationLabel = pt ? ({
    KNOWN_MALICIOUS: "MALICIOSO CONHECIDO",
    KNOWN_PHISHING: "PHISHING CONHECIDO",
    NO_KNOWN_MATCH: "NENHUMA CORRESPONDÊNCIA CONHECIDA",
    UNKNOWN: "DESCONHECIDA",
    PROVIDER_UNAVAILABLE: "LISTA INDISPONÍVEL",
  }[threat.state] ?? threat.state.replaceAll("_", " ")) : threat.state.replaceAll("_", " ");
  const sensitiveLabel = pt && sensitive ? ({ password: "palavra-passe", payment: "dados de pagamento", personal: "informação pessoal", permission: "permissão" }[sensitive] ?? sensitive) : sensitive ?? (pt ? "Nenhum" : "None");
  const recommendation = pt
    ? risk.recommendation === "LEAVE_AND_BLOCK" ? "Saia e bloqueie este domínio (na extensão ou app)" : risk.recommendation === "LEAVE" ? "Saia deste site" : risk.recommendation === "VERIFY_INDEPENDENTLY" ? "Verifique de forma independente" : "Prossiga com cuidado"
    : risk.recommendation === "LEAVE_AND_BLOCK" ? "Leave and block this domain (in the extension or desktop app)" : risk.recommendation === "LEAVE" ? "Leave this website" : risk.recommendation === "VERIFY_INDEPENDENTLY" ? "Verify independently" : "Proceed with care";

  const kindLabel = (kind: string) => pt
    ? ({ known: "conhecido", likely: "provável", signal: "sinal", unknown: "desconhecido", limitation: "limitação" }[kind] ?? kind)
    : kind;

  const userBlockEv = risk.evidence.find((item) => item.id === "user-block");
  const userBlockTitle = userBlockEv
    ? pt
      ? evidencePt["user-block"]?.[0] ?? userBlockEv.title
      : userBlockEv.title
    : null;
  const whyItems = riskWhyItems(risk.evidence, { bannerShowsUserBlock: Boolean(userBlockTitle) });
  const detailRows: Array<{ kind: string; display: string; meta?: string }> = [
    { kind: pt ? "Domínio" : "Domain", display: parsed.registrableDomain },
    { kind: pt ? "Reputação (lista própria)" : "Reputation (own list)", display: reputationLabel },
    { kind: pt ? "Pedido" : "Request", display: sensitiveLabel },
    { kind: pt ? "Provas" : "Evidence", display: confidenceLabel },
    { kind: pt ? "Fonte" : "Source", display: threat.providerName },
    ...risk.evidence.map((item) => {
      const translated =
        item.id === "probe-blocked" ? probeBlockedTranslated(item) : pt ? evidencePt[item.id] : undefined;
      return { kind: kindLabel(item.kind), display: translated?.[0] ?? item.title, meta: translated?.[1] ?? item.detail };
    }),
    { kind: "URL", display: parsed.fullUrl },
    { kind: pt ? "Protocolo" : "Protocol", display: `${parsed.protocol.toUpperCase()} ${parsed.usesHttps ? (pt ? "· ligação encriptada" : "· encrypted connection") : (pt ? "· não encriptada" : "· not encrypted")}` },
    { kind: "Hostname", display: parsed.hostname },
    ...(parsed.subdomain ? [{ kind: pt ? "Subdomínio" : "Subdomain", display: parsed.subdomain }] : []),
    ...(parsed.hasPunycode ? [{ kind: "Punycode", display: parsed.hostname }] : []),
    ...(live?.redirectChain?.length ? [{ kind: pt ? "Redirecionamentos" : "Redirects", display: live.redirectChain.join(" → ") }] : []),
    ...(analysis.timing
      ? [
          {
            kind: pt ? "Tempo" : "Timing",
            display: formatTimingSummaryLine(analysis.timing, timingLabels(t))
          }
        ]
      : []),
    ...(pt ? limitationsPt : [...risk.limitations, "URLs are not sent to Google Safe Browsing or other third-party reputation services."]).map((item) => ({ kind: pt ? "Limite" : "Limit", display: item })),
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
            {pt
              ? evidencePt["user-block"]?.[1] ?? userBlockEv?.detail
              : userBlockEv?.detail}
          </p>
        )}
        <ul className="why-list">
          {whyItems.length === 0 ? (
            <li>{pt ? "Nenhum sinal forte além das limitações habituais." : "No strong signals beyond the usual limitations."}</li>
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
              const translated = pt ? evidencePt[full.id] : undefined;
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
                {pt ? "Bloquear no desktop (buusdo)" : "Block on desktop (buusdo)"}
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
              href={`/${pt ? "pt-PT" : "en"}/settings#settings-block-lists`}
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
            href={`/${pt ? "pt-PT" : "en"}/settings#settings-block-lists`}
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
                  locale={(pt ? "pt-PT" : "en") as Locale}
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