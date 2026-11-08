/**
 * Shared Halt phishing toast DOM builder — used by content.js and the unit fixture.
 * Vanilla JS; attaches to globalThis.__buusdoPhishingToastMount for content scripts.
 */
(function phishingToastMountFactory(global) {
  const COPY = {
    en: {
      phishing: "Phishing pattern blocked",
      dismiss: "Dismiss",
      dangerLevel: "Danger level: Halt",
      ignoreRisk: "If you ignore this: do not type passwords or pay on this page.",
      nextStepsTitle: "What to do next",
      nextLeave: "Leave this page now.",
      nextNoCreds: "Do not enter passwords, cards, or SMS codes here.",
      nextVerify: "Verify on an official domain or app you already trust."
    },
    "pt-PT": {
      phishing: "Padrão de phishing bloqueado",
      dismiss: "Fechar",
      dangerLevel: "Nível de perigo: Parar",
      ignoreRisk: "Se ignorar: não escreva palavras-passe nem pague nesta página.",
      nextStepsTitle: "O que fazer a seguir",
      nextLeave: "Saia já desta página.",
      nextNoCreds: "Não introduza palavras-passe, cartões ou códigos SMS aqui.",
      nextVerify: "Verifique num domínio ou app oficial em que já confia."
    }
  };

  /**
   * @param {Document} doc
   * @param {{ lang?: string }} [opts]
   * @returns {HTMLElement} toast root (data-testid=result-action-row)
   */
  function buildPhishingToast(doc, opts) {
    const lang = opts?.lang === "pt-PT" ? "pt-PT" : "en";
    const table = COPY[lang];
    const el = doc.createElement("div");
    el.className = "portugal-cp-shield-toast portugal-cp-shield-toast--danger";
    el.setAttribute("data-testid", "result-action-row");

    const label = doc.createElement("span");
    label.className = "portugal-cp-shield-toast__label";
    label.textContent = table.phishing;
    el.appendChild(label);

    const danger = doc.createElement("p");
    danger.className = "portugal-cp-shield-toast__danger-level";
    danger.setAttribute("data-testid", "result-danger-level");
    danger.textContent = table.dangerLevel;
    el.appendChild(danger);

    const ignore = doc.createElement("p");
    ignore.className = "portugal-cp-shield-toast__ignore-risk";
    ignore.setAttribute("data-testid", "result-ignore-risk");
    ignore.textContent = table.ignoreRisk;
    el.appendChild(ignore);

    const steps = doc.createElement("ol");
    steps.className = "portugal-cp-shield-toast__next-steps";
    steps.setAttribute("data-testid", "result-next-steps");
    steps.setAttribute("aria-label", table.nextStepsTitle);
    for (const line of [table.nextLeave, table.nextNoCreds, table.nextVerify]) {
      const li = doc.createElement("li");
      li.textContent = line;
      steps.appendChild(li);
    }
    el.appendChild(steps);

    return el;
  }

  const api = {
    COPY,
    buildPhishingToast,
    dismissLabel(lang) {
      return COPY[lang === "pt-PT" ? "pt-PT" : "en"].dismiss;
    }
  };

  global.__buusdoPhishingToastMount = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
