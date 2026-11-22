/**
 * Region / network auto-guide: any China Pages HTML → Workers when reachable.
 *
 * GET /api/health succeeds → location.replace matching Workers locale path.
 * Opt out: ?china_stay=1 or localStorage buusdocst-china-stay=1 (read the notice).
 * Legacy install/privacy stubs bounce to index/en first; those stubs also load this script.
 */
(function () {
  var WORKERS_ORIGIN = "https://buusdocst.mtsu.workers.dev";
  var HEALTH = WORKERS_ORIGIN + "/api/health";
  var TIMEOUT_MS = 5000;
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
  /* All China site HTML pages auto-guide when reachable (no entry-only gate). */

  function wantsStay() {
    try {
      var params = new URLSearchParams(location.search || "");
      if (params.get("china_stay") === "1") {
        try {
          localStorage.setItem(STAY_KEY, "1");
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
    try {
      if (sessionStorage.getItem(STAY_SESSION) === "1") return true;
      if (localStorage.getItem(STAY_KEY) === "1") return true;
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

  function markFail() {
    var el = document.getElementById("workers-reach");
    if (!el) return;
    var status = el.querySelector("[data-reach-status]");
    var detail = el.querySelector("[data-reach-detail]");
    var isEn = document.documentElement.lang === "en";
    if (status) {
      status.textContent = isEn
        ? "Workers unreachable — showing notice"
        : "Workers 不可达 — 显示本告知书";
    }
    if (detail) {
      detail.textContent = isEn
        ? "Stay on this page, or retry when your network can reach Cloudflare."
        : "请停留在本页；待网络可到达 Cloudflare 后再试。";
    }
    el.dataset.state = "fail";
  }

  var ctrl = new AbortController();
  var timer = setTimeout(function () {
    ctrl.abort();
  }, TIMEOUT_MS);

  fetch(HEALTH, {
    method: "GET",
    mode: "cors",
    credentials: "omit",
    signal: ctrl.signal,
    headers: { Accept: "application/json" }
  })
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
      try {
        sessionStorage.setItem(STAY_SESSION, "0");
      } catch (_) {}
      location.replace(dest);
    })
    .catch(function () {
      clearTimeout(timer);
      markFail();
    });
})();
