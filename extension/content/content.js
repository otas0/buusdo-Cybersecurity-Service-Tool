/**
 * Content script — page toast injections
 * ----------------------------------------
 * Shows a small non-blocking toast when the background reports a blocked
 * tracker or phishing pattern, e.g. "Blocked 1 Tracker".
 *
 * Vanilla JS only. Idempotent: safe if injected more than once.
 *
 * Toast dismiss (optional): SW reads chrome.storage.local.shieldToastDismiss and
 * passes dismiss:true|false on every SHIELD_TOAST. Content trusts that boolean only.
 * Trust boolean `dismiss` from the service worker only (no storage read — avoids race).
 * Uses appendToastAction so the button stays under data-testid=result-action-row.
 *
 * Halt phishing DOM: shared builder in phishing-toast-mount.js (fixture + content).
 */

(function initShieldContent() {
  if (window.__portugalCpShieldContent) return;
  window.__portugalCpShieldContent = true;

  const api = globalThis.browser ?? globalThis.chrome;
  const mount = globalThis.__buusdoPhishingToastMount;

  const TOAST_HOST_ID = "portugal-cp-shield-toast-host";
  /** Default when SHIELD_TOAST omits dismiss (SW always sends a boolean). */
  const TOAST_DISMISS_DEFAULT = false;

  const TRACKER_COPY = {
    en: {
      tracker: "Blocked {n} Tracker",
      trackers: "Blocked {n} Trackers",
      dismiss: "Dismiss"
    },
    "pt-PT": {
      tracker: "Bloqueado {n} Rastreador",
      trackers: "Bloqueados {n} Rastreadores",
      dismiss: "Fechar"
    },
    "zh-Hans": {
      tracker: "已拦截 {n} 个跟踪器",
      trackers: "已拦截 {n} 个跟踪器",
      dismiss: "关闭"
    },
    "zh-Hant": {
      tracker: "已攔截 {n} 個追蹤器",
      trackers: "已攔截 {n} 個追蹤器",
      dismiss: "關閉"
    },
    ja: {
      tracker: "トラッカーを {n} 件ブロック",
      trackers: "トラッカーを {n} 件ブロック",
      dismiss: "閉じる"
    },
    mi: {
      tracker: "Kua ārai {n} kaitutei",
      trackers: "Kua ārai {n} kaitutei",
      dismiss: "Whakakore"
    },
    th: {
      tracker: "บล็อกตัวติดตาม {n} รายการ",
      trackers: "บล็อกตัวติดตาม {n} รายการ",
      dismiss: "ปิด"
    },
    vi: {
      tracker: "Đã chặn {n} trình theo dõi",
      trackers: "Đã chặn {n} trình theo dõi",
      dismiss: "Đóng"
    },
    "pt-BR": {
      tracker: "Bloqueado {n} Rastreador",
      trackers: "Bloqueados {n} Rastreadores",
      dismiss: "Fechar"
    },
    de: {
      tracker: "{n} Tracker blockiert",
      trackers: "{n} Tracker blockiert",
      dismiss: "Schließen"
    },
    fr: {
      tracker: "{n} traqueur bloqué",
      trackers: "{n} traqueurs bloqués",
      dismiss: "Fermer"
    },
    es: {
      tracker: "{n} rastreador bloqueado",
      trackers: "{n} rastreadores bloqueados",
      dismiss: "Cerrar"
    },
    it: {
      tracker: "Bloccato {n} tracker",
      trackers: "Bloccati {n} tracker",
      dismiss: "Chiudi"
    },
    nl: {
      tracker: "{n} tracker geblokkeerd",
      trackers: "{n} trackers geblokkeerd",
      dismiss: "Sluiten"
    },
    af: {
      tracker: "{n} naspoor geblokkeer",
      trackers: "{n} naspoors geblokkeer",
      dismiss: "Maak toe"
    },
    zu: {
      tracker: "Kuvinjwe {n} umlandeli",
      trackers: "Kuvinjwe {n} abalandeli",
      dismiss: "Vala"
    }
  };

  /** Prefer mount.resolveToastLang when present (catalog-aware). */
  function resolveContentLang(raw) {
    if (mount && typeof mount.resolveToastLang === "function") {
      return mount.resolveToastLang(raw);
    }
    const id = String(raw || "en");
    if (TRACKER_COPY[id]) return id;
    if (id.startsWith("zh-Hant") || id === "zh-TW" || id === "zh-HK") return "zh-Hant";
    if (id.startsWith("zh") || id === "zh-CN") return "zh-Hans";
    if (id.startsWith("pt")) return "pt-PT";
    if (id === "jp") return "ja";
    if (id === "th" || id.startsWith("th-")) return TRACKER_COPY.th ? "th" : "en";
    if (id === "vi" || id.startsWith("vi-")) return TRACKER_COPY.vi ? "vi" : "en";
    if (id === "mi" || id.startsWith("mi-")) return TRACKER_COPY.mi ? "mi" : "en";
    return "en";
  }

  function ensureHost() {
    let host = document.getElementById(TOAST_HOST_ID);
    if (host) return host;
    host = document.createElement("div");
    host.id = TOAST_HOST_ID;
    host.setAttribute("aria-live", "polite");
    host.setAttribute("aria-relevant", "additions");
    (document.documentElement || document.body).appendChild(host);
    return host;
  }

  /**
   * @param {HTMLElement} row data-testid=result-action-row node
   * @param {HTMLElement} control button/link to append
   */
  function appendToastAction(row, control) {
    if (!row || !control) return;
    if (!control.classList.contains("portugal-cp-shield-toast__action")) {
      control.classList.add("portugal-cp-shield-toast__action");
    }
    row.appendChild(control);
  }

  /**
   * @param {{ dismiss?: boolean }} payload
   */
  function resolveToastDismissFlag(payload) {
    if (typeof payload?.dismiss === "boolean") return payload.dismiss;
    return TOAST_DISMISS_DEFAULT;
  }

  /**
   * @param {{ kind: 'tracker'|'phishing', count?: number, lang?: string, dismiss?: boolean }} payload
   */
  async function showToast(payload) {
    const lang = resolveContentLang(payload.lang);
    const count = Math.max(1, Number(payload.count) || 1);
    const host = ensureHost();

    let el;
    if (payload.kind === "phishing") {
      if (!mount || typeof mount.buildPhishingToast !== "function") {
        console.warn("[buusdo] phishing-toast-mount.js missing — skip Halt toast");
        return;
      }
      el = mount.buildPhishingToast(document, { lang });
    } else {
      const table = TRACKER_COPY[lang] || TRACKER_COPY.en;
      const text = (count === 1 ? table.tracker : table.trackers).replace("{n}", String(count));
      el = document.createElement("div");
      el.className = "portugal-cp-shield-toast portugal-cp-shield-toast--caution";
      // Keep dismiss/Leave controls inside this node when added — same testid as RiskResult.
      // Label span stays first; appendToastAction() adds buttons after it.
      el.setAttribute("data-testid", "result-action-row");
      const label = document.createElement("span");
      label.className = "portugal-cp-shield-toast__label";
      label.textContent = text;
      el.appendChild(label);
    }

    let hideTimer = 0;
    let fadeTimer = 0;
    const removeToast = () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(fadeTimer);
      el.classList.remove("is-visible");
      fadeTimer = window.setTimeout(() => el.remove(), 320);
    };

    const dismissOn = resolveToastDismissFlag(payload);
    if (dismissOn) {
      const dismissText =
        payload.kind === "phishing" && mount
          ? mount.dismissLabel(lang)
          : (TRACKER_COPY[lang] || TRACKER_COPY.en).dismiss;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = dismissText;
      btn.setAttribute("aria-label", dismissText);
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        removeToast();
      });
      appendToastAction(el, btn);
    }

    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-visible"));
    hideTimer = window.setTimeout(removeToast, payload.kind === "phishing" ? 7200 : 3200);
  }

  api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "SHIELD_TOAST") {
      void showToast(message)
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }
    return false;
  });
})();
