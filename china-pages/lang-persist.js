/**
 * Persist China Pages language (zh | en) across Entry / Install / Privacy.
 * Explicit 中文 · EN clicks win; later visits to the other locale redirect.
 */
(function () {
  var KEY = "buusdocst-china-lang";
  var PAIRS = {
    "index.html": { zh: "index.html", en: "en.html" },
    "en.html": { zh: "index.html", en: "en.html" },
    "": { zh: "index.html", en: "en.html" },
    "install.html": { zh: "install.html", en: "install-en.html" },
    "install-en.html": { zh: "install.html", en: "install-en.html" },
    "privacy.html": { zh: "privacy.html", en: "privacy-en.html" },
    "privacy-en.html": { zh: "privacy.html", en: "privacy-en.html" }
  };

  function pageFile() {
    var path = location.pathname || "";
    var base = path.split("/").pop() || "";
    if (!base || base === "buusdocst") return "index.html";
    return base;
  }

  function pageLang(file) {
    return /-en\.html$/.test(file) || file === "en.html" ? "en" : "zh";
  }

  function readPref() {
    try {
      var v = localStorage.getItem(KEY);
      return v === "en" || v === "zh" ? v : null;
    } catch (_) {
      return null;
    }
  }

  function writePref(lang) {
    try {
      localStorage.setItem(KEY, lang);
    } catch (_) {
      /* private mode */
    }
  }

  function counterpart(file, lang) {
    var pair = PAIRS[file];
    if (!pair) return null;
    return pair[lang] || null;
  }

  function rewriteHref(href, lang) {
    if (!href || href.charAt(0) === "#" || /^(https?:|mailto:)/i.test(href)) return href;
    var hash = "";
    var q = "";
    var path = href;
    var hashIdx = path.indexOf("#");
    if (hashIdx >= 0) {
      hash = path.slice(hashIdx);
      path = path.slice(0, hashIdx);
    }
    var qIdx = path.indexOf("?");
    if (qIdx >= 0) {
      q = path.slice(qIdx);
      path = path.slice(0, qIdx);
    }
    var name = path.split("/").pop() || "";
    if (!name || name === "." || name.indexOf(".") === -1) {
      name = "index.html";
    }
    var target = counterpart(name, lang);
    if (!target || target === name) return href;
    var prefix = path.slice(0, path.length - name.length);
    return prefix + target + q + hash;
  }

  function rewriteInternalLinks(lang) {
    var anchors = document.querySelectorAll("a[href]");
    for (var i = 0; i < anchors.length; i += 1) {
      var a = anchors[i];
      if (a.closest && a.closest('[data-testid="china-lang-switch"]')) continue;
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#") continue;
      if (href.indexOf("./") !== 0) continue;
      var next = rewriteHref(href, lang);
      if (next !== href) a.setAttribute("href", next);
    }
  }

  function bindLangSwitch() {
    var root = document.querySelector('[data-testid="china-lang-switch"]');
    if (!root) return;
    var links = root.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i += 1) {
      links[i].addEventListener("click", function (ev) {
        var a = ev.currentTarget;
        var href = a.getAttribute("href") || "";
        var file = href.split("/").pop() || "";
        var hashIdx = file.indexOf("#");
        if (hashIdx >= 0) file = file.slice(0, hashIdx);
        var lang = pageLang(file || "index.html");
        writePref(lang);
      });
    }
  }

  var file = pageFile();
  var current = pageLang(file);
  var pref = readPref();

  // Visiting a locale page adopts that locale (deep link = choice).
  if (!pref) {
    writePref(current);
    pref = current;
  }

  // Keep chosen language when a shared/zh URL is opened after EN was selected.
  if (pref && pref !== current) {
    var dest = counterpart(file, pref);
    if (dest && dest !== file) {
      var next =
        location.pathname.replace(/[^/]*$/, dest) + location.search + location.hash;
      location.replace(next);
      return;
    }
  }

  writePref(current);

  function boot() {
    rewriteInternalLinks(current);
    bindLangSwitch();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
