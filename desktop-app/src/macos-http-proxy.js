/**
 * Optional one-shot: set/clear macOS system HTTP(S) proxy for the Shield educational proxy.
 * Requires user authorization (osascript admin prompt). Honest: HTTP proxy only; reversible.
 */
const { execFile } = require("child_process");
const { PROXY_PORT } = require("./proxy-server");

function defaultRun(cmd, args, timeout = 60_000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, windowsHide: true }, (err, stdout, stderr) => {
      resolve({
        ok: !err,
        code: err?.code ?? 0,
        stdout: String(stdout || "").trim(),
        stderr: String(stderr || "").trim(),
        error: err ? err.message : null
      });
    });
  });
}

/**
 * @param {{ run?: typeof defaultRun }} [deps]
 */
async function detectWifiService(deps = {}) {
  const run = deps.run || defaultRun;
  const listed = await run("networksetup", ["-listallnetworkservices"]);
  if (!listed.ok) return "Wi-Fi";
  const lines = listed.stdout.split(/\r?\n/).map((l) => l.replace(/^\*/, "").trim()).filter(Boolean);
  for (const name of ["Wi-Fi", "WiFi", "AirPort"]) {
    if (lines.includes(name)) return name;
  }
  return lines.find((n) => /wi-?fi|airport/i.test(n)) || "Wi-Fi";
}

/**
 * @param {{ host?: string, port?: number, service?: string }} opts
 * @param {{ run?: typeof defaultRun, platform?: string }} [deps]
 */
async function setHttpProxy(opts = {}, deps = {}) {
  const platform = deps.platform || process.platform;
  const run = deps.run || defaultRun;
  if (platform !== "darwin") {
    return { ok: false, error: "macos-only", applied: false };
  }
  const host = String(opts.host || "127.0.0.1").trim() || "127.0.0.1";
  const port = Number(opts.port || PROXY_PORT || 8080);
  const service = String(opts.service || (await detectWifiService(deps))).trim() || "Wi-Fi";

  const web = await run("networksetup", ["-setwebproxy", service, host, String(port)]);
  const secure = await run("networksetup", ["-setsecurewebproxy", service, host, String(port)]);
  if (web.ok && secure.ok) {
    return {
      ok: true,
      applied: true,
      service,
      host,
      port,
      method: "networksetup",
      note: "HTTP and HTTPS system proxies point at the Shield proxy. Turn off in System Settings → Network when done."
    };
  }

  const script = [
    `do shell script "networksetup -setwebproxy '${service.replace(/'/g, "'\\''")}' ${host} ${port}`,
    ` && networksetup -setsecurewebproxy '${service.replace(/'/g, "'\\''")}' ${host} ${port}"`,
    ` with administrator privileges`
  ].join("");
  const elevated = await run("osascript", ["-e", script], 120_000);
  if (!elevated.ok) {
    return {
      ok: false,
      applied: false,
      service,
      host,
      port,
      error: elevated.stderr || elevated.error || web.stderr || "networksetup-denied",
      note: "macOS refused networksetup. Grant admin when prompted, or set System Settings → Network → Proxies manually to 127.0.0.1:8080."
    };
  }
  return {
    ok: true,
    applied: true,
    service,
    host,
    port,
    method: "osascript-admin",
    note: "HTTP and HTTPS system proxies point at the Shield proxy (admin authorized). Turn off in System Settings → Network when done."
  };
}

/**
 * @param {{ service?: string }} opts
 * @param {{ run?: typeof defaultRun, platform?: string }} [deps]
 */
async function clearHttpProxy(opts = {}, deps = {}) {
  const platform = deps.platform || process.platform;
  const run = deps.run || defaultRun;
  if (platform !== "darwin") {
    return { ok: false, error: "macos-only", applied: false };
  }
  const service = String(opts.service || (await detectWifiService(deps))).trim() || "Wi-Fi";
  const web = await run("networksetup", ["-setwebproxystate", service, "off"]);
  const secure = await run("networksetup", ["-setsecurewebproxystate", service, "off"]);
  if (web.ok && secure.ok) {
    return {
      ok: true,
      applied: true,
      service,
      method: "networksetup",
      note: "System HTTP/HTTPS proxies turned off for this service."
    };
  }
  const script = [
    `do shell script "networksetup -setwebproxystate '${service.replace(/'/g, "'\\''")}' off`,
    ` && networksetup -setsecurewebproxystate '${service.replace(/'/g, "'\\''")}' off"`,
    ` with administrator privileges`
  ].join("");
  const elevated = await run("osascript", ["-e", script], 120_000);
  if (!elevated.ok) {
    return {
      ok: false,
      applied: false,
      service,
      error: elevated.stderr || elevated.error || web.stderr || "networksetup-denied",
      note: "macOS refused networksetup. Grant admin when prompted, or turn proxies off in System Settings → Network."
    };
  }
  return {
    ok: true,
    applied: true,
    service,
    method: "osascript-admin",
    note: "System HTTP/HTTPS proxies turned off (admin authorized)."
  };
}

module.exports = {
  setHttpProxy,
  clearHttpProxy,
  detectWifiService,
  PROXY_PORT,
  /** @internal test helper */
  _defaultRun: defaultRun
};