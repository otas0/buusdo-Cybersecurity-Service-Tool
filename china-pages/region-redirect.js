/**
 * Force auto-guide: China Pages → Workers when /api/health is reachable.
 *
 * Default: always location.replace matching Workers locale (no sticky localStorage stay).
 * Opt out for this tab only: ?china_stay=1 → sessionStorage (read the notice).
 * Clear: ?china_stay=0. Legacy buusdocst-china-stay in localStorage is ignored and cleared.
 *
 * Load sync in <head> (no defer) so reachable networks bounce before paint.
 */
(function () {
  var WORKERS_ORIGIN = "https://buusdocst.mtsu.workers.dev";
  var HEALTH = WORKERS_ORIGIN + "/api/health";
  var TIMEOUT_MS = 8000;
  var EXPECTED_SERVICE = "buusdocst";
  var STAY_KEY = "buusdocst-china-stay";
  var STAY_SESSION = "buusdocst-china-stay-session";

  function pageFile() {
    var path = location.pathname || "";
    var base = path.split("/").pop() || "";
    if (!base || base === "buusdocst") return "index.html";
    return base;
  }

  var file = pageFile();

  function wantsStay() {
    try {
      var params = new URLSearchParams(location.search || "");
      if (params.get("china_stay") === "1") {
        try {
          sessionStorage.setItem(STAY_SESSION, "1");
        } catch (_) {}
        try {
          localStorage.removeItem(STAY_KEY);
        } catch (_) {}
        return true;
      }
      if (params.get("china_stay") === "0") {
        try {
          localStorage.removeItem(STAY_KEY);
          sessionStorage.removeItem(STAY_SESSION);
        } catch (_) {}
        return false;
      }
    } catch (_) {}
    /* Drop legacy sticky stay so reachable networks always force-bounce. */
    try {
      localStorage.removeItem(STAY_KEY);
    } catch (_) {}
    try {
      if (sessionStorage.getItem(STAY_SESSION) === "1") return true;
    } catch (_) {}
    return false;
  }

  if (wantsStay()) return;

  function workersPath() {
    var pageIsEn =
      file === "en.html" ||
      /-en\.html$/.test(file) ||
      (document.documentElement && document.documentElement.lang === "en");
    var tags = [];
    try {
      if (navigator.languages && navigator.languages.length) {
        for (var i = 0; i < navigator.languages.length; i += 1) tags.push(navigator.languages[i]);
      } else if (navigator.language) {
        tags.push(navigator.language);
      }
    } catch (_) {}
    for (var j = 0; j < tags.length; j += 1) {
      var raw = String(tags[j] || "").toLowerCase();
      if (
        raw === "zh-tw" ||
        raw.indexOf("zh-tw") === 0 ||
        raw === "zh-hk" ||
        raw.indexOf("zh-hk") === 0 ||
        raw === "zh-mo" ||
        raw.indexOf("zh-hant") === 0
      ) {
        return "/zh-Hant";
      }
      if (
        raw === "zh" ||
        raw.indexOf("zh-cn") === 0 ||
        raw.indexOf("zh-sg") === 0 ||
        raw.indexOf("zh-hans") === 0
      ) {
        return "/zh-Hans";
      }
      if (raw.indexOf("en") === 0) return "/en";
    }
    return pageIsEn ? "/en" : "/zh-Hans";
  }

  function bounce(dest) {
    try {
      sessionStorage.setItem(STAY_SESSION, "0");
    } catch (_) {}
    try {
      location.replace(dest);
    } catch (_) {
      location.href = dest;
    }
  }

  function announce(msg) {
    var el = document.getElementById("workers-reach");
    if (!el) return;
    var status = el.querySelector("[data-reach-status]");
    var detail = el.querySelector("[data-reach-detail]");
    if (status) status.textContent = msg;
    if (detail) {
      detail.textContent =
        document.documentElement.lang === "en"
          ? "Redirecting to the full product site…"
          : "正在切换到完整检查站…";
    }
    el.dataset.state = "ok";
  }

  function markFail(kind) {
    var el = document.getElementById("workers-reach");
    if (!el) return;
    var status = el.querySelector("[data-reach-status]");
    var detail = el.querySelector("[data-reach-detail]");
    var isEn = document.documentElement.lang === "en";
    var preflight = kind === "preflight";
    if (status) {
      status.textContent = preflight
        ? isEn
          ? "Workers probe blocked"
          : "Workers 探测被拦截"
        : isEn
          ? "Workers unreachable"
          : "Workers 不可达";
    }
    if (detail) {
      detail.textContent = preflight
        ? isEn
          ? "Health OPTIONS/CORS failed. Showing this notice — retry on another network, or open Workers directly."
          : "健康探测 OPTIONS/CORS 失败。显示本告知书 — 请换网络重试，或直接打开 Workers。"
        : isEn
          ? "Showing this notice. Retry when Cloudflare is reachable."
          : "显示本告知书。待可达 Cloudflare 后再试。";
    }
    el.dataset.state = "fail";
  }

  var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  var timer = setTimeout(function () {
    if (ctrl) ctrl.abort();
  }, TIMEOUT_MS);

  var opts = {
    method: "GET",
    mode: "cors",
    credentials: "omit",
    cache: "no-store"
  };
  if (ctrl) opts.signal = ctrl.signal;

  fetch(HEALTH, opts)
    .then(function (res) {
      clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      if (!(data && data.ok === true && data.service === EXPECTED_SERVICE)) {
        throw new Error("health not ok");
      }
      var dest = WORKERS_ORIGIN + workersPath();
      announce(
        document.documentElement.lang === "en"
          ? "Workers reachable — opening full site"
          : "Workers 可达 — 正在打开完整站点"
      );
      bounce(dest);
    })
    .catch(function (err) {
      clearTimeout(timer);
      var msg = String((err && err.message) || err || "");
      var name = String((err && err.name) || "");
      var preflight =
        name === "TypeError" ||
        /Failed to fetch|NetworkError|Load failed|CORS|cross-origin|aborted/i.test(msg);
      markFail(preflight ? "preflight" : "unreachable");
    });
})();
