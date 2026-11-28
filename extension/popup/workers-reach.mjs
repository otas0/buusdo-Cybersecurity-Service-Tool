/**
 * Workers health probe for slim popup (testable without DOM).
 *
 * Unreachable ≠ mainland geo. Extension never reads IP/country — only /api/health.
 * China notice is a recovery link for networks that block workers.dev, not a CN verdict.
 *
 * Policy: first fail → Workers CTA primary for everyone. Emphasize China notice only when
 * UI/Accept-Language looks Chinese AND consecutive fails ≥ 2.
 */

export const CHINA_NOTICE_URL =
  "https://otas0.github.io/buusdocst/?utm_source=extension";
/** Slower paths (JP / mobile) need >4.5s; false unreachable framed as “China”. */
export const HEALTH_PROBE_MS = 8000;

/**
 * zh-Hans / zh-Hant UI (or Accept-Language zh*) may emphasize China notice after 2 fails.
 * @param {string} [lang]
 * @param {string[]} [acceptLanguages]
 */
export function prefersChinaNoticePrimary(lang, acceptLanguages) {
  const id = String(lang || "");
  if (id === "zh-Hans" || id === "zh-Hant" || id === "zh") return true;
  const langs = Array.isArray(acceptLanguages) ? acceptLanguages : [];
  return langs.some((l) => {
    const s = String(l || "").toLowerCase();
    return s === "zh" || s.startsWith("zh-");
  });
}

/**
 * Non-zh UI never elevates China notice to primary (Open website stays primary).
 * zh UI: China notice primary only after a second consecutive fail.
 * @param {object} opts
 * @param {string} [opts.lang]
 * @param {string[]} [opts.acceptLanguages]
 * @param {number} [opts.failStreak] consecutive unreachable count (1 = first fail)
 */
export function resolveChinaNoticePrimary({
  lang,
  acceptLanguages,
  failStreak = 1
} = {}) {
  const zh = prefersChinaNoticePrimary(lang, acceptLanguages);
  if (!zh) return false;
  return Number(failStreak) >= 2;
}

/**
 * @typedef {{ unreachable: boolean, ms: number, timedOut: boolean }} ProbeResult
 */

/**
 * @param {object} opts
 * @param {string} [opts.base]
 * @param {typeof fetch} [opts.fetchImpl]
 * @param {number} [opts.timeoutMs]
 * @returns {Promise<ProbeResult>}
 */
export async function probeWorkersHealth({
  base = "https://buusdocst.mtsu.workers.dev",
  fetchImpl = globalThis.fetch,
  timeoutMs = HEALTH_PROBE_MS
} = {}) {
  const origin = String(base || "").replace(/\/$/, "");
  const started = Date.now();
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, timeoutMs);
  try {
    const res = await fetchImpl(`${origin}/api/health`, {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
      signal: ctrl.signal
    });
    clearTimeout(timer);
    const ms = Math.max(0, Date.now() - started);
    if (!res.ok) return { unreachable: true, ms, timedOut: false };
    const j = await res.json().catch(() => null);
    const ok = !!(j && j.ok === true && j.service === "buusdocst");
    return { unreachable: !ok, ms, timedOut: false };
  } catch {
    clearTimeout(timer);
    const ms = Math.max(0, Date.now() - started);
    return { unreachable: true, ms, timedOut };
  }
}

/**
 * @param {HTMLAnchorElement|null|undefined} el
 * @param {"primary"|"ghost"} kind
 */
function setCtaKind(el, kind) {
  if (!el) return;
  el.classList.remove("primary-button", "ghost-button", "china-notice-cta", "workers-open-cta");
  if (kind === "primary") {
    el.classList.add("primary-button");
  } else {
    el.classList.add("ghost-button");
  }
}

/**
 * Toggle manage-lists vs unreachable recovery CTAs (unit-test friendly).
 * @param {object} ui
 * @param {HTMLElement|null} [ui.box]
 * @param {HTMLAnchorElement|null} [ui.manage]
 * @param {HTMLElement|null} [ui.manageWrap]
 * @param {HTMLElement|null} [ui.manageHint]
 * @param {HTMLAnchorElement|null} [ui.chinaCta]
 * @param {HTMLAnchorElement|null} [ui.workersCta]
 * @param {HTMLButtonElement|null} [ui.retryBtn]
 * @param {boolean} unreachable
 * @param {object} [copy]
 */
export function applyUnreachableUi(ui, unreachable, copy = {}) {
  const { box, manage, manageWrap, manageHint, chinaCta, workersCta, cta, retryBtn } =
    ui || {};
  const noticeHref = copy.noticeHref || CHINA_NOTICE_URL;
  const workersHref =
    copy.workersHref || "https://buusdocst.mtsu.workers.dev/?utm_source=extension";
  const chinaEl = chinaCta || cta || null;
  const workersEl = workersCta || null;

  if (!unreachable) {
    if (box) box.hidden = true;
    if (manageWrap) manageWrap.hidden = false;
    if (manage) manage.hidden = false;
    if (manageHint) manageHint.hidden = false;
    if (retryBtn) retryBtn.hidden = true;
    return { manageHidden: false, chinaPrimary: false };
  }

  if (box) box.hidden = false;
  if (manageWrap) manageWrap.hidden = true;
  if (manage) {
    manage.hidden = true;
    manage.removeAttribute("href");
  }
  if (manageHint) {
    manageHint.hidden = false;
    if (copy.hintWhenDown) manageHint.textContent = copy.hintWhenDown;
  }
  if (retryBtn) {
    retryBtn.hidden = false;
    if (copy.retryLabel) retryBtn.textContent = copy.retryLabel;
    retryBtn.disabled = copy.retryBusy === true;
  }

  const chinaPrimary = copy.chinaPrimary === true;
  if (chinaEl) {
    chinaEl.href = noticeHref;
    if (copy.chinaLabel || copy.ctaLabel) {
      chinaEl.textContent = copy.chinaLabel || copy.ctaLabel;
    }
    setCtaKind(chinaEl, chinaPrimary ? "primary" : "ghost");
    chinaEl.classList.add("china-notice-cta");
    chinaEl.hidden = false;
  }
  if (workersEl) {
    workersEl.href = workersHref;
    if (copy.workersLabel) workersEl.textContent = copy.workersLabel;
    setCtaKind(workersEl, chinaPrimary ? "ghost" : "primary");
    workersEl.classList.add("workers-open-cta");
    workersEl.hidden = false;
  }
  return { manageHidden: true, chinaPrimary };
}

/**
 * Append probe timing to unreachable copy.
 * @param {string} base
 * @param {{ ms?: number, timedOut?: boolean }} probe
 * @param {{ timeoutSuffix?: string }} [labels]
 */
export function formatUnreachableWithProbeMs(base, probe, labels = {}) {
  const ms = Math.max(0, Math.round(Number(probe?.ms) || 0));
  const timeoutNote =
    probe?.timedOut === true
      ? labels.timeoutSuffix || " (hit timeout)"
      : "";
  const timing = ` [${ms}ms${timeoutNote}]`;
  const text = String(base || "").trim();
  if (!text) return timing.trim();
  return `${text}${timing}`;
}
