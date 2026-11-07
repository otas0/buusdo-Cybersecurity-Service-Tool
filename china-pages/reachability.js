/**
 * Read-only Workers reachability probe for the China entry.
 * Does not call /api/check — only GET /api/health with a short timeout.
 */
(function () {
  const WORKERS_ORIGIN = "https://buusdocst.mtsu.workers.dev";
  const HEALTH = WORKERS_ORIGIN + "/api/health";
  const TIMEOUT_MS = 6000;

  const el = document.getElementById("workers-reach");
  if (!el) return;

  const status = el.querySelector("[data-reach-status]");
  const detail = el.querySelector("[data-reach-detail]");
  if (!status || !detail) return;

  /** Soften primary “open full check” CTAs when Workers is unreachable. */
  function setFullCheckCta(reachable) {
    const links = document.querySelectorAll("[data-full-check]");
    for (let i = 0; i < links.length; i += 1) {
      const a = links[i];
      if (reachable) {
        a.classList.add("primary-button");
        a.classList.remove("ghost-button");
      } else {
        a.classList.remove("primary-button");
        a.classList.add("ghost-button");
      }
    }
  }

  const copy =
    document.documentElement.lang === "en"
      ? {
          checking: "Checking Workers…",
          ok: "Workers reachable",
          fail: "Workers unreachable from this network",
          okDetail: "Health OK — you can open the full check.",
          failDetail:
            "Timeout or error — use this page for privacy / install; retry the full check when the network allows.",
        }
      : {
          checking: "正在探测 Workers…",
          ok: "Workers 可达",
          fail: "当前网络无法到达 Workers",
          okDetail: "健康检查通过 — 可打开完整检查。",
          failDetail:
            "超时或失败 — 请先用本页查看隐私 / 安装说明；网络允许时再打开完整检查。",
        };

  status.textContent = copy.checking;
  el.dataset.state = "checking";
  detail.textContent = "";

  const started = performance.now();
  const ctrl = new AbortController();
  const timer = setTimeout(function () {
    ctrl.abort();
  }, TIMEOUT_MS);

  fetch(HEALTH, {
    method: "GET",
    mode: "cors",
    credentials: "omit",
    signal: ctrl.signal,
    headers: { Accept: "application/json" },
  })
    .then(function (res) {
      clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      const ms = Math.round(performance.now() - started);
      if (data && data.ok === true && data.service === "buusdocst") {
        el.dataset.state = "ok";
        status.textContent = copy.ok;
        detail.textContent = copy.okDetail + " (" + ms + " ms)";
        setFullCheckCta(true);
      } else {
        throw new Error("unexpected health payload");
      }
    })
    .catch(function () {
      clearTimeout(timer);
      el.dataset.state = "fail";
      status.textContent = copy.fail;
      detail.textContent = copy.failDetail;
      setFullCheckCta(false);
    });
})();
