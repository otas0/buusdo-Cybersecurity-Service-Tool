/**
 * Slim popup — status only. Auto-scan + page toasts live in the service worker / content script.
 * Language + theme follow the OS (no manual controls).
 */
import { normalizeUiLang, t } from "../shared/i18n.js";
import { api } from "../shared/browser-api.js";
import { DEFAULT_API_BASE } from "../shared/api-base-migrate.mjs";
/** CI: popup must import this key (Website API chrome moved off popup). */
import { API_BASE_FALLBACK_NOTICE_KEY } from "../shared/api-base-fallback.mjs";
import {
  CHINA_NOTICE_URL,
  probeWorkersHealth,
  applyUnreachableUi
} from "./workers-reach.mjs";
void API_BASE_FALLBACK_NOTICE_KEY;

const BRAND_ALT = "buusdo Cybersecurity Service Tool";

const els = {
  readout: document.getElementById("readout"),
  statusWord: document.getElementById("statusWord"),
  statusDetail: document.getElementById("statusDetail"),
  trackersLabel: document.getElementById("trackersLabel"),
  trackersValue: document.getElementById("trackersValue"),
  phishingLabel: document.getElementById("phishingLabel"),
  phishingValue: document.getElementById("phishingValue"),
  manageListsLink: document.getElementById("manageListsLink"),
  manageListsHint: document.getElementById("manageListsHint"),
  apiUnreachable: document.getElementById("apiUnreachable"),
  apiUnreachableText: document.getElementById("apiUnreachableText"),
  chinaNoticeCta: document.getElementById("chinaNoticeCta"),
  wordmark: document.querySelector(".brand-lockup img[data-brand-wordmark], .brand-lockup img.brand-logo")
};

function resolveSystemLang() {
  try {
    if (api?.i18n?.getUILanguage) {
      return normalizeUiLang(api.i18n.getUILanguage());
    }
  } catch {
    /* fall through */
  }
  return normalizeUiLang(navigator.language || navigator.languages?.[0] || "en");
}

function sameWordmarkSrc(img, next) {
  const cur = img.getAttribute("src") || "";
  if (cur === next) return true;
  try {
    return (
      new URL(cur, location.href).pathname === new URL(next, location.href).pathname
    );
  } catch {
    return cur.endsWith(next) || next.endsWith(cur);
  }
}

/** Apply OS color-scheme and swap the single wordmark SVG src (only when path changes). */
function applyThemeFromSystem() {
  const light = window.matchMedia("(prefers-color-scheme: light)").matches;
  document.documentElement.dataset.theme = light ? "light" : "dark";
  document.documentElement.style.colorScheme = light ? "light" : "dark";
  const img = els.wordmark;
  if (!img) return;
  const darkSrc = img.getAttribute("data-src-dark") || "../icons/buusdo-wordmark.svg";
  const lightSrc = img.getAttribute("data-src-light") || "../icons/buusdo-wordmark-on-light.svg";
  const next = light ? lightSrc : darkSrc;
  if (!sameWordmarkSrc(img, next)) img.setAttribute("src", next);
  img.setAttribute("alt", "");
  img.setAttribute("aria-hidden", "true");
  const lockup = img.closest(".brand-lockup");
  if (lockup) lockup.setAttribute("aria-label", BRAND_ALT);
}

function levelWord(lang, level) {
  if (level === "safe") return t(lang, "statusSafe");
  if (level === "caution") return t(lang, "statusCaution");
  if (level === "danger") return t(lang, "statusDanger");
  return t(lang, "statusStandby");
}

function levelDetail(lang, level) {
  if (level === "safe") return t(lang, "detailSafe");
  if (level === "caution") return t(lang, "detailCaution");
  if (level === "danger") return t(lang, "detailDanger");
  return t(lang, "statusIdle");
}

function paint(lang, state) {
  const level = state?.lastScan?.level || "idle";
  if (els.readout) els.readout.dataset.level = level;
  if (els.statusWord) els.statusWord.textContent = levelWord(lang, level);
  if (els.statusDetail) {
    els.statusDetail.textContent =
      level === "idle"
        ? t(lang, "statusIdle") || "Watching this tab — alerts appear on the page."
        : levelDetail(lang, level);
  }
  if (els.trackersLabel) els.trackersLabel.textContent = t(lang, "trackersBlocked");
  if (els.phishingLabel) els.phishingLabel.textContent = t(lang, "phishingHits");
  if (els.trackersValue) {
    els.trackersValue.textContent = String(state?.lastScan?.trackersBlocked ?? 0);
  }
  if (els.phishingValue) {
    els.phishingValue.textContent = String(state?.lastScan?.phishingHits ?? 0);
  }
  if (els.manageListsLink) {
    const base = String(DEFAULT_API_BASE || "https://buusdocst.mtsu.workers.dev").replace(/\/$/, "");
    const blocked = String(state?.lastBlockedDomain || "").trim();
    const q = blocked ? `?blocked=${encodeURIComponent(blocked)}` : "";
    els.manageListsLink.href = `${base}/${lang}/lists-offline${q}`;
    els.manageListsLink.textContent =
      lang === "pt-PT"
        ? "Gerir listas de bloqueio e confiança"
        : lang === "zh-Hans"
          ? "管理拦截与信任名单"
          : lang === "zh-Hant"
            ? "管理攔截與信任清單"
            : "Manage block & trust lists";
  }
  if (els.manageListsHint) {
    const blocked = String(state?.lastBlockedDomain || "").trim();
    if (blocked) {
      els.manageListsHint.textContent =
        lang === "pt-PT"
          ? `Último bloqueio: ${blocked} — listas no site.`
          : lang === "zh-Hans"
            ? `刚拦截：${blocked} — 名单在网站查看。`
            : lang === "zh-Hant"
              ? `剛攔截：${blocked} — 清單在網站查看。`
              : `Just blocked: ${blocked} — lists open on the website.`;
    } else {
      els.manageListsHint.textContent =
        lang === "pt-PT"
          ? "Listas abrem no site — não neste popup."
          : lang === "zh-Hans"
            ? "名单在网站查看，不在此弹窗。"
            : lang === "zh-Hant"
              ? "清單在網站查看，不在此彈窗。"
              : "Lists open on the website — not in this popup.";
    }
  }
}

async function syncPrefsFromSystem(lang) {
  try {
    await api.runtime.sendMessage({ type: "SHIELD_SET_PREFS", lang });
  } catch {
    /* ignore */
  }
}

function paintUnreachable(lang, unreachable) {
  const manage = els.manageListsLink;
  const manageWrap = manage?.closest?.("p.manage") || manage?.parentElement;
  const hintWhenDown =
    lang === "zh-Hans"
      ? "网站名单需 Workers；当前不可达 — 请先打开告知书。"
      : lang === "zh-Hant"
        ? "網站名單需 Workers；目前不可達 — 請先開啟告知書。"
        : lang === "pt-PT"
          ? "Listas no site precisam do Workers; inacessível — abra o aviso China."
          : "Website lists need Workers; unreachable — open the China notice first.";
  const ctaLabel = t(lang, "websiteApiChinaNoticeLink") || "Open China notice";
  applyUnreachableUi(
    {
      box: els.apiUnreachable,
      manage,
      manageWrap,
      manageHint: els.manageListsHint,
      cta: els.chinaNoticeCta
    },
    unreachable,
    { hintWhenDown, ctaLabel, noticeHref: CHINA_NOTICE_URL }
  );
  if (unreachable && els.apiUnreachableText) {
    els.apiUnreachableText.textContent =
      t(lang, "websiteApiCfUnreachable") ||
      "Cannot reach workers.dev (timeout). Open the China notice — do not wait for a redirect.";
  }
}

async function refresh() {
  const lang = resolveSystemLang();
  document.documentElement.lang = lang === "pt-PT" ? "pt" : lang;
  applyThemeFromSystem();
  await syncPrefsFromSystem(lang);
  let state = null;
  try {
    const res = await api.runtime.sendMessage({ type: "SHIELD_GET_STATE" });
    state = res?.state || null;
  } catch {
    state = null;
  }
  paint(lang, state);
  const base = String(DEFAULT_API_BASE || "https://buusdocst.mtsu.workers.dev").replace(
    /\/$/,
    ""
  );
  const unreachable = await probeWorkersHealth({ base });
  paintUnreachable(lang, unreachable);
}

applyThemeFromSystem();
const mq = window.matchMedia("(prefers-color-scheme: light)");
mq.addEventListener?.("change", () => {
  applyThemeFromSystem();
});

try {
  api.storage?.onChanged?.addListener((changes, area) => {
    if (area !== "local") return;
    if (!changes?.shieldState) return;
    const lang = resolveSystemLang();
    paint(lang, changes.shieldState.newValue || null);
  });
} catch {
  /* ignore */
}

void refresh();
