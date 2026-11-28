/**
 * Workers health probe for slim popup (testable without DOM).
 *
 *   import { probeWorkersHealth, applyUnreachableUi } from "./workers-reach.mjs";
 */

export const CHINA_NOTICE_URL =
  "https://otas0.github.io/buusdocst/?utm_source=extension";
export const HEALTH_PROBE_MS = 4500;

/**
 * @param {object} opts
 * @param {string} [opts.base]
 * @param {typeof fetch} [opts.fetchImpl]
 * @param {number} [opts.timeoutMs]
 * @returns {Promise<boolean>} true when Workers is unreachable / unhealthy
 */
export async function probeWorkersHealth({
  base = "https://buusdocst.mtsu.workers.dev",
  fetchImpl = globalThis.fetch,
  timeoutMs = HEALTH_PROBE_MS
} = {}) {
  const origin = String(base || "").replace(/\/$/, "");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${origin}/api/health`, {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
      signal: ctrl.signal
    });
    clearTimeout(timer);
    if (!res.ok) return true;
    const j = await res.json().catch(() => null);
    return !(j && j.ok === true && j.service === "buusdocst");
  } catch {
    clearTimeout(timer);
    return true;
  }
}

/**
 * Toggle manage-lists vs China CTA without i18n (unit-test friendly).
 * @param {object} ui
 * @param {HTMLElement|null} [ui.box]
 * @param {HTMLAnchorElement|null} [ui.manage]
 * @param {HTMLElement|null} [ui.manageWrap]
 * @param {HTMLElement|null} [ui.manageHint]
 * @param {HTMLAnchorElement|null} [ui.cta]
 * @param {boolean} unreachable
 * @param {{ noticeHref?: string, hintWhenDown?: string, ctaLabel?: string }} [copy]
 */
export function applyUnreachableUi(ui, unreachable, copy = {}) {
  const {
    box,
    manage,
    manageWrap,
    manageHint,
    cta
  } = ui || {};
  const noticeHref = copy.noticeHref || CHINA_NOTICE_URL;
  if (!unreachable) {
    if (box) box.hidden = true;
    if (manageWrap) manageWrap.hidden = false;
    if (manage) {
      manage.hidden = false;
    }
    if (manageHint) manageHint.hidden = false;
    return { manageHidden: false };
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
  if (cta) {
    cta.href = noticeHref;
    if (copy.ctaLabel) cta.textContent = copy.ctaLabel;
  }
  return { manageHidden: true };
}
