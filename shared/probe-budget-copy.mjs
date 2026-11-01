/**
 * Shared probe-budget copy for website UI (and later extension).
 * Formula matches security/probe-budget.ts — keep wording in sync.
 */
export const PROBE_TIMEOUT_ENV_KEY = "CHECK_PROBE_TIMEOUT_MS";

export const PROBE_BUDGET_COPY = {
  en: {
    formula: "Formula: max timed-out probe × 1.2, rounded up to 100ms.",
    envLine: (ms) => `${PROBE_TIMEOUT_ENV_KEY}=${ms}`,
    copyLabel: `Copy ${PROBE_TIMEOUT_ENV_KEY}=…`,
    copied: "Copied",
    copyFailed: "Could not copy — select the line manually."
  },
  "pt-PT": {
    formula: "Fórmula: pior sonda com timeout × 1.2, arredondado para cima a 100ms.",
    envLine: (ms) => `${PROBE_TIMEOUT_ENV_KEY}=${ms}`,
    copyLabel: `Copiar ${PROBE_TIMEOUT_ENV_KEY}=…`,
    copied: "Copiado",
    copyFailed: "Não foi possível copiar — selecione a linha manualmente."
  }
};

export function probeBudgetCopy(locale) {
  return PROBE_BUDGET_COPY[locale === "pt-PT" ? "pt-PT" : "en"];
}