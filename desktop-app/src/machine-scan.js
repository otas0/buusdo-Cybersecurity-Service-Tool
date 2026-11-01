/**
 * Desktop duty: scan this computer as far as this user can read, then wait
 * for a real yes/no before any block. No process kill, no system-folder edits,
 * no TLS decrypt. Host signals come from the shared address checker.
 */

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const machineBlock = require("./machine-block");
const {
  extractHosts,
  isDisguisedName,
  isProtectedSystemPath,
  isShellRc,
  isSkippedDirName,
  isTempOrDownloadsPath,
  isUnder,
  isUnderAny,
  isUserStartupPath,
  mayQuarantinePath,
  planSystemTargets,
  shouldAsk,
  textHasLocalDropPath
} = require("./machine-paths");

const LIMITS = {
  maxFiles: 20000,
  maxDepth: 14,
  maxBytes: 128 * 1024,
  maxDurationMs: 90_000,
  maxFindings: 300
};

const SCRIPT_EXT = new Set([
  ".command",
  ".sh",
  ".bash",
  ".zsh",
  ".ps1",
  ".bat",
  ".cmd",
  ".vbs",
  ".jse",
  ".hta",
  ".url",
  ".desktop",
  ".webloc"
]);

let latest = emptyResult("idle");
let fullFindings = [];
let runChain = null;
let bound = null;
let activeSession = null;

function emptyResult(status) {
  return {
    ok: true,
    status,
    platform: process.platform,
    startedAt: null,
    finishedAt: null,
    findings: [],
    findingCount: 0,
    actionableCount: 0,
    findingSetId: "none",
    findingsTruncated: false,
    error: null,
    coverage: emptyCoverage()
  };
}

function emptyCoverage() {
  return {
    files: 0,
    processes: 0,
    connections: 0,
    applications: 0,
    startupItems: 0,
    capped: false,
    remaining: 0,
    currentDir: "",
    denied: [],
    roots: [],
    skippedProduct: false
  };
}

function findingSetId(findings) {
  const ids = (findings || []).map((item) => item.id).sort();
  if (!ids.length) return "none";
  return crypto.createHash("sha1").update(ids.join("\n")).digest("hex").slice(0, 16);
}

function execText(cmd, args, timeout = 8000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, maxBuffer: 6_000_000, windowsHide: true }, (err, stdout) => {
      const text = String(stdout || "");
      if (err && !text) {
        resolve({ ok: false, error: String(err.code || err.message || "exec-failed"), text: "" });
        return;
      }
      resolve({ ok: true, text });
    });
  });
}

function yieldLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}

function defaultProductRoots() {
  return [path.resolve(__dirname, ".."), path.resolve(__dirname, "..", "..")];
}

function defaultRootSpecs(home, platform, includeSystem) {
  /** @type {Array<{ path: string, depth: number, mode: string }>} */
  const specs = [{ path: home, depth: LIMITS.maxDepth, mode: "user" }];
  if (!includeSystem) return specs.filter((spec) => spec.path && fs.existsSync(spec.path));
  if (platform === "darwin") {
    specs.push(
      { path: "/Applications", depth: 1, mode: "inventory" },
      { path: "/opt", depth: 2, mode: "inventory" },
      { path: "/usr/local", depth: 2, mode: "inventory" },
      { path: path.join(home, "Library/LaunchAgents"), depth: 3, mode: "startup" },
      { path: "/Library/LaunchAgents", depth: 2, mode: "startup-system" },
      { path: "/Library/LaunchDaemons", depth: 2, mode: "startup-system" }
    );
  } else if (platform === "linux") {
    specs.push(
      { path: "/opt", depth: 2, mode: "inventory" },
      { path: "/usr/local", depth: 2, mode: "inventory" },
      { path: "/usr/share/applications", depth: 1, mode: "inventory" },
      { path: path.join(home, ".config/autostart"), depth: 3, mode: "startup" },
      { path: "/etc/cron.d", depth: 1, mode: "startup-system" }
    );
  } else if (platform === "win32") {
    const pf = process.env.ProgramFiles;
    const pf86 = process.env["ProgramFiles(x86)"];
    const pub = process.env.PUBLIC;
    const appdata = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    const programData = process.env.ProgramData || "C:\\ProgramData";
    if (pf) specs.push({ path: pf, depth: 1, mode: "inventory" });
    if (pf86) specs.push({ path: pf86, depth: 1, mode: "inventory" });
    if (pub) specs.push({ path: pub, depth: 6, mode: "user" });
    specs.push(
      { path: path.join(appdata, "Microsoft", "Windows", "Start Menu", "Programs", "Startup"), depth: 3, mode: "startup" },
      {
        path: path.join(programData, "Microsoft", "Windows", "Start Menu", "Programs", "Startup"),
        depth: 2,
        mode: "startup-system"
      }
    );
  }
  return pruneSpecs(specs.filter((spec) => spec.path && fs.existsSync(spec.path)));
}

function pruneSpecs(specs) {
  return specs.filter((spec, index) => {
    const resolved = path.resolve(spec.path);
    return !specs.some((other, otherIndex) => {
      if (otherIndex === index) return false;
      return isUnder(resolved, other.path);
    });
  });
}

function riskyLocation(filePath, homeDir) {
  const value = String(filePath || "").replace(/\\/g, "/").toLowerCase();
  if (isTempOrDownloadsPath(value)) return true;
  const home = path.resolve(homeDir || "").replace(/\\/g, "/").toLowerCase();
  return (
    value.startsWith(`${home}/desktop/`) ||
    value.startsWith(`${home}/downloads/`) ||
    value.startsWith(`${home}/public/`) ||
    value.includes("/desktop/") ||
    value.includes("/downloads/")
  );
}

function noteDenied(coverage, location) {
  if (!location || coverage.denied.includes(location) || coverage.denied.length >= 40) return;
  coverage.denied.push(location);
}

function addFinding(ctx, finding) {
  if (ctx.findings.length >= LIMITS.maxFindings) {
    ctx.findingsTruncated = true;
    return;
  }
  const key = `${finding.reason}|${finding.host || ""}|${finding.path || ""}|${finding.enforceable}`;
  if (ctx.seen.has(key)) return;
  ctx.seen.add(key);
  ctx.findings.push({
    id: crypto.createHash("sha1").update(key).digest("hex").slice(0, 12),
    reason: finding.reason,
    surface: finding.surface,
    host: finding.host || null,
    path: finding.path || null,
    display: finding.display,
    enforceable: finding.enforceable
  });
}

function considerHosts(ctx, text, meta) {
  for (const host of extractHosts(text)) {
    let result;
    try {
      result = ctx.classify(`https://${host}/`);
    } catch {
      continue;
    }
    if (!result?.kind || !result.host) continue;
    if (ctx.isTrusted(result.host)) {
      ctx.trustedSkipped.add(result.host);
      continue;
    }
    addFinding(ctx, {
      reason: result.kind,
      surface: meta.surface,
      host: result.host,
      display: result.host,
      enforceable: "block-host"
    });
    if (
      meta.quarantineFile &&
      meta.filePath &&
      !isProtectedSystemPath(meta.filePath) &&
      !isShellRc(meta.filePath, ctx.homeDir) &&
      !isUnderAny(meta.filePath, ctx.productRoots)
    ) {
      addFinding(ctx, {
        reason: meta.startup ? "startup-item" : "dropped-file",
        surface: meta.surface,
        host: result.host,
        path: meta.filePath,
        display: path.basename(meta.filePath),
        enforceable: "quarantine"
      });
    }
  }
}

async function readSmallText(filePath) {
  let stat;
  try {
    stat = await fs.promises.stat(filePath);
  } catch {
    return null;
  }
  if (!stat.isFile() || stat.size === 0 || stat.size > LIMITS.maxBytes) return null;
  const buf = await fs.promises.readFile(filePath);
  if (buf.includes(0)) return null;
  return buf.toString("utf8");
}

function insideProject(filePath, homeDir, cache) {
  let dir = path.dirname(path.resolve(filePath));
  const stop = path.resolve(homeDir);
  while (dir && (dir === stop || isUnder(dir, stop) || dir.startsWith(stop))) {
    if (cache.has(dir)) {
      if (cache.get(dir)) return true;
    } else {
      const hit = fs.existsSync(path.join(dir, "package.json")) || fs.existsSync(path.join(dir, ".git"));
      cache.set(dir, hit);
      if (hit) return true;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return false;
}

async function inspectFile(filePath, mode, ctx) {
  const resolved = path.resolve(filePath);
  if (ctx.visited.has(resolved)) return;
  ctx.visited.add(resolved);
  ctx.coverage.files += 1;
  if (isUnderAny(resolved, ctx.productRoots)) {
    ctx.coverage.skippedProduct = true;
    return;
  }
  const base = path.basename(resolved);
  if (mode === "inventory") {
    if (base.endsWith(".app") || base.endsWith(".desktop")) ctx.coverage.applications += 1;
    return;
  }
  const startup =
    mode === "startup" ||
    mode === "startup-system" ||
    (mode === "user" && isUserStartupPath(resolved, ctx.homeDir, ctx.platform));
  if (startup) ctx.coverage.startupItems += 1;
  const canQuarantine =
    mode !== "startup-system" &&
    mode !== "inventory" &&
    mayQuarantinePath(resolved, ctx.homeDir, ctx.platform);

  if (canQuarantine && isDisguisedName(base)) {
    addFinding(ctx, {
      reason: "disguised-file",
      surface: "file",
      path: resolved,
      display: base,
      enforceable: "quarantine"
    });
  }

  let read = false;
  if (isShellRc(resolved, ctx.homeDir) || startup) read = true;
  else if (mode === "user" && !insideProject(resolved, ctx.homeDir, ctx.projectCache)) {
    const ext = path.extname(base).toLowerCase();
    if (SCRIPT_EXT.has(ext) || (ext === ".js" && riskyLocation(resolved, ctx.homeDir))) read = true;
  }
  if (!read) return;
  const text = await readSmallText(resolved);
  if (text == null) return;
  const startupRisk = startup && canQuarantine && (textHasLocalDropPath(text) || isTempOrDownloadsPath(resolved));
  considerHosts(ctx, text, {
    surface: startup ? "startup" : "file",
    filePath: resolved,
    quarantineFile: canQuarantine && (startupRisk || riskyLocation(resolved, ctx.homeDir)),
    startup
  });
  if (startupRisk) {
    addFinding(ctx, {
      reason: "startup-temp",
      surface: "startup",
      path: resolved,
      display: base,
      enforceable: "quarantine"
    });
  }
}

function enqueueSpec(ctx, spec) {
  const dir = path.resolve(spec.path);
  ctx.coverage.roots.push(spec.path);
  ctx.pending.push({ dir, depth: 0, mode: spec.mode, maxDepth: spec.depth });
}

function noteDir(ctx, dir) {
  ctx.coverage.currentDir = dir;
  const now = Date.now();
  if (now - ctx.lastPublishMs > 300) {
    ctx.lastPublishMs = now;
    ctx.publish();
  }
}

async function expandDir(job, ctx) {
  noteDir(ctx, job.dir);
  if (isUnderAny(job.dir, ctx.productRoots)) {
    ctx.coverage.skippedProduct = true;
    return;
  }
  let entries;
  try {
    entries = await fs.promises.readdir(job.dir, { withFileTypes: true });
  } catch {
    noteDenied(ctx.coverage, job.dir);
    return;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const full = path.join(job.dir, entry.name);
    if (entry.isDirectory()) {
      if (isSkippedDirName(entry.name)) continue;
      if (entry.name.endsWith(".app")) {
        ctx.coverage.applications += 1;
        ctx.coverage.files += 1;
        continue;
      }
      if (job.depth < job.maxDepth) {
        ctx.pending.push({ dir: full, depth: job.depth + 1, mode: job.mode, maxDepth: job.maxDepth });
      }
      continue;
    }
    if (entry.isFile()) ctx.fileQueue.push({ path: full, mode: job.mode });
  }
}

function overBudget(ctx) {
  return ctx.coverage.files >= ctx.fileBudget || Date.now() > ctx.deadlineMs;
}

async function drain(ctx) {
  while (ctx.fileQueue.length || ctx.pending.length) {
    if (overBudget(ctx)) {
      ctx.coverage.capped = true;
      ctx.coverage.remaining = ctx.pending.length + ctx.fileQueue.length;
      return;
    }
    if (!ctx.fileQueue.length) {
      await expandDir(ctx.pending.pop(), ctx);
      continue;
    }
    const file = ctx.fileQueue.pop();
    noteDir(ctx, path.dirname(file.path));
    await inspectFile(file.path, file.mode, ctx);
    if (ctx.coverage.files % 40 === 0) await yieldLoop();
  }
  ctx.coverage.capped = false;
  ctx.coverage.remaining = 0;
}

async function collectSystem(ctx) {
  const platform = ctx.platform;
  if (platform === "win32") {
    const processes = await execText(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "Get-CimInstance Win32_Process | ForEach-Object { $_.ProcessId.ToString() + ' ' + [string]$_.CommandLine }"
      ],
      15000
    );
    if (processes.ok) {
      ctx.coverage.processes = processes.text.split(/\r?\n/).filter(Boolean).length;
      considerHosts(ctx, processes.text, { surface: "process", quarantineFile: false });
    } else noteDenied(ctx.coverage, "processes");

    const connections = await execText("netstat", ["-n"]);
    if (connections.ok) ctx.coverage.connections = connections.text.split(/\r?\n/).filter((line) => line.includes(":")).length;
    else noteDenied(ctx.coverage, "connections");

    const tasks = await execText("schtasks", ["/Query", "/FO", "LIST"], 12000);
    if (tasks.ok) {
      considerHosts(ctx, tasks.text, { surface: "startup", quarantineFile: false });
      await quarantinePlanned(ctx, planSystemTargets(tasks.text, { platform: "win32", homeDir: ctx.homeDir }));
    } else noteDenied(ctx.coverage, "scheduled-tasks");

    for (const key of [
      "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
      "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
    ]) {
      const reg = await execText("reg", ["query", key]);
      if (reg.ok) {
        considerHosts(ctx, reg.text, { surface: "startup", quarantineFile: false });
        await quarantinePlanned(ctx, planSystemTargets(reg.text, { platform: "win32", homeDir: ctx.homeDir }));
      } else noteDenied(ctx.coverage, key);
    }
  } else {
    const processes = await execText("ps", ["-ax", "-o", "pid=,command="]);
    if (processes.ok) {
      ctx.coverage.processes = processes.text.split(/\n/).filter(Boolean).length;
      considerHosts(ctx, processes.text, { surface: "process", quarantineFile: false });
    } else noteDenied(ctx.coverage, "processes");

    const connections =
      platform === "linux" ? await execText("ss", ["-Htn"]) : await execText("lsof", ["-nP", "-iTCP", "-sTCP:ESTABLISHED"]);
    if (connections.ok) {
      ctx.coverage.connections = connections.text.split(/\n/).filter(Boolean).length;
      considerHosts(ctx, connections.text, { surface: "network", quarantineFile: false });
    } else noteDenied(ctx.coverage, "connections");

    const cron = await execText("crontab", ["-l"], 4000);
    if (cron.ok) {
      considerHosts(ctx, cron.text, { surface: "startup", quarantineFile: false });
      await quarantinePlanned(ctx, planSystemTargets(cron.text, { platform: ctx.platform, homeDir: ctx.homeDir }));
    }
  }

  const hostsFile =
    platform === "win32"
      ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "drivers", "etc", "hosts")
      : "/etc/hosts";
  try {
    const text = fs.readFileSync(hostsFile, "utf8");
    considerHosts(ctx, text, { surface: "hosts", quarantineFile: false });
  } catch {
    noteDenied(ctx.coverage, hostsFile);
  }
}

async function quarantinePlanned(ctx, planned) {
  for (const item of planned || []) {
    if (item.action !== "quarantine") continue;
    let stat;
    try {
      stat = await fs.promises.stat(item.path);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;
    addFinding(ctx, {
      reason: "startup-item",
      surface: "startup",
      path: path.resolve(item.path),
      display: path.basename(item.path),
      enforceable: "quarantine"
    });
  }
}

async function readShellRc(ctx) {
  for (const name of [".zshrc", ".zprofile", ".zshenv", ".bashrc", ".bash_profile", ".profile", ".bash_login"]) {
    const filePath = path.join(ctx.homeDir, name);
    const text = await readSmallText(filePath);
    if (text == null) continue;
    considerHosts(ctx, text, { surface: "shell", filePath, quarantineFile: false });
  }
}

function snapshot(ctx) {
  const actionableCount = ctx.findings.filter(
    (item) => item.enforceable === "block-host" || item.enforceable === "quarantine"
  ).length;
  return {
    ok: true,
    status: ctx.status,
    platform: ctx.platform,
    startedAt: ctx.startedAt,
    finishedAt: ctx.finishedAt,
    findings: ctx.findings.slice(),
    findingCount: ctx.findings.length,
    actionableCount,
    findingSetId: findingSetId(ctx.findings),
    findingsTruncated: ctx.findingsTruncated === true,
    trustedSkipped: [...(ctx.trustedSkipped || [])],
    error: ctx.error || null,
    coverage: {
      ...ctx.coverage,
      denied: ctx.coverage.denied.slice()
    }
  };
}

/**
 * @param {{
 *   roots?: string[],
 *   homeDir?: string,
 *   includeSystem?: boolean,
 *   classify: (url: string) => { kind?: string|null, host?: string|null },
 *   isTrusted?: (host: string) => boolean,
 *   productRoots?: string[],
 *   onUpdate?: (view: object) => void
 * }} options
 */
function fileBudget(options) {
  const fromEnv = Number(process.env.SHIELD_MACHINE_SCAN_MAX_FILES);
  const requested = options?.limits?.maxFiles || (Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 0);
  return requested > 0 ? requested : LIMITS.maxFiles;
}

function createSession(options) {
  const homeDir = path.resolve(options.homeDir || os.homedir());
  const includeSystem = options.includeSystem !== false;
  const specs = options.roots
    ? options.roots.map((root) => ({ path: path.resolve(root), depth: options.limits?.maxDepth || LIMITS.maxDepth, mode: "user" }))
    : defaultRootSpecs(homeDir, process.platform, includeSystem);
  const chunk = fileBudget(options);
  const duration = options.limits?.maxDurationMs || LIMITS.maxDurationMs;
  const ctx = {
    status: "scanning",
    platform: process.platform,
    homeDir,
    classify: options.classify,
    isTrusted: typeof options.isTrusted === "function" ? options.isTrusted : () => false,
    productRoots: options.productRoots || defaultProductRoots(),
    findings: [],
    findingsTruncated: false,
    trustedSkipped: new Set(),
    seen: new Set(),
    visited: new Set(),
    projectCache: new Map(),
    pending: [],
    fileQueue: [],
    coverage: emptyCoverage(),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    fileBudget: chunk,
    chunk,
    deadlineMs: Date.now() + duration,
    duration,
    includeSystem,
    specs,
    prepared: false,
    error: null,
    lastPublishMs: 0,
    publish() {
      if (typeof options.onUpdate === "function") options.onUpdate(snapshot(ctx));
    }
  };

  async function prepare() {
    if (ctx.prepared) return;
    ctx.prepared = true;
    if (includeSystem) await collectSystem(ctx);
    await readShellRc(ctx);
    for (const spec of specs) {
      if (!fs.existsSync(spec.path)) noteDenied(ctx.coverage, spec.path);
      else enqueueSpec(ctx, spec);
    }
  }

  return {
    ctx,
    async run() {
      ctx.status = "scanning";
      ctx.publish();
      try {
        await prepare();
        await drain(ctx);
        ctx.status = ctx.error ? "error" : "ready";
      } catch (err) {
        ctx.status = "error";
        ctx.error = err instanceof Error ? err.message : "scan-failed";
      }
      ctx.finishedAt = new Date().toISOString();
      const result = snapshot(ctx);
      ctx.publish();
      return result;
    },
    async continueScan() {
      if (!ctx.coverage.capped || (!ctx.pending.length && !ctx.fileQueue.length)) {
        const error = new Error("nothing-to-continue");
        error.code = "nothing-to-continue";
        throw error;
      }
      ctx.status = "scanning";
      ctx.coverage.capped = false;
      ctx.fileBudget += ctx.chunk;
      ctx.deadlineMs = Date.now() + ctx.duration;
      ctx.publish();
      try {
        await drain(ctx);
        ctx.status = "ready";
      } catch (err) {
        ctx.status = "error";
        ctx.error = err instanceof Error ? err.message : "scan-failed";
      }
      ctx.finishedAt = new Date().toISOString();
      const result = snapshot(ctx);
      ctx.publish();
      return result;
    }
  };
}

async function scanMachine(options) {
  const session = createSession(options);
  return session.run();
}

function pathsMatch(left, right) {
  const a = path.resolve(String(left || ""));
  const b = path.resolve(String(right || ""));
  if (a === b) return true;
  const strip = (value) => value.replace(/^\/private/, "");
  return strip(a) === strip(b);
}

function hostKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

function decorate(raw) {
  const decision = machineBlock.readDecision();
  const quarantineItems = machineBlock.listQuarantine();
  let blockedHosts = new Set();
  try {
    const listsStore = require("./lists-store");
    const lists = listsStore.peekCache();
    blockedHosts = new Set((lists?.blocked || []).map((entry) => hostKey(entry.domain)));
  } catch {
    blockedHosts = new Set();
  }
  const openFindings = [];
  const settledFindings = [];
  for (const finding of raw.findings || []) {
    const hostSettled = finding.enforceable === "block-host" && blockedHosts.has(hostKey(finding.host));
    const fileSettled =
      finding.enforceable === "quarantine" &&
      quarantineItems.some((item) => pathsMatch(item.from, finding.path) || pathsMatch(item.requested, finding.path));
    if (hostSettled || fileSettled) settledFindings.push(finding);
    else openFindings.push(finding);
  }
  const openActionable = openFindings.filter(
    (item) => item.enforceable === "block-host" || item.enforceable === "quarantine"
  ).length;
  const view = {
    ...raw,
    actionableCount: raw.status === "ready" ? openActionable : raw.actionableCount,
    findings: openFindings.slice(0, 40).concat(settledFindings.slice(0, 40)),
    openFindings: openFindings.slice(0, 40),
    settledFindings: settledFindings.slice(0, 40),
    trustedSkipped: raw.trustedSkipped || [],
    quarantineItems: quarantineItems.map((item) => ({
      from: item.from,
      error: item.error || null
    })),
    decision: decision
      ? {
          choice: decision.choice,
          at: decision.at,
          findingSetId: decision.findingSetId,
          hosts: Array.isArray(decision.hosts) ? decision.hosts.length : 0
        }
      : null,
    quarantined: quarantineItems.length
  };
  view.ask = shouldAsk(view, decision);
  return view;
}

function optionsFromEnv(classify, isTrusted, onUpdate) {
  const fixture = process.env.SHIELD_MACHINE_SCAN_ROOT
    ? path.resolve(process.env.SHIELD_MACHINE_SCAN_ROOT)
    : "";
  return {
    classify,
    isTrusted,
    onUpdate,
    homeDir: fixture || os.homedir(),
    includeSystem: fixture ? process.env.SHIELD_MACHINE_SCAN_SYSTEM === "1" : true,
    roots: fixture ? [fixture] : undefined,
    productRoots: defaultProductRoots()
  };
}

function bind(deps) {
  bound = deps;
}

function remember(view) {
  latest = view;
  fullFindings = view.findings || [];
  if (typeof bound?.onUpdate === "function") bound.onUpdate(decorate(view));
}

async function runBound() {
  if (!bound) throw new Error("machine-scan-not-bound");
  if (runChain) return runChain;
  latest = emptyResult("scanning");
  latest.startedAt = new Date().toISOString();
  if (typeof bound.onUpdate === "function") bound.onUpdate(decorate(latest));
  runChain = (async () => {
    try {
      activeSession = createSession(
        optionsFromEnv(bound.classify, bound.isTrusted, (view) => remember(view))
      );
      const result = await activeSession.run();
      latest = result;
      fullFindings = result.findings || [];
    } catch (err) {
      latest = {
        ...emptyResult("error"),
        error: err instanceof Error ? err.message : "scan-failed",
        finishedAt: new Date().toISOString()
      };
      fullFindings = [];
    } finally {
      runChain = null;
      if (typeof bound.onUpdate === "function") bound.onUpdate(decorate(latest));
    }
    return decorate(latest);
  })();
  return runChain;
}

function requestContinue() {
  if (!activeSession || runChain) {
    const error = new Error(runChain ? "scan-running" : "nothing-to-continue");
    error.code = error.message;
    throw error;
  }
  runChain = (async () => {
    try {
      const result = await activeSession.continueScan();
      latest = result;
      fullFindings = result.findings || [];
    } catch (err) {
      latest = {
        ...latest,
        status: "error",
        error: err instanceof Error ? err.message : "scan-failed"
      };
    } finally {
      runChain = null;
      if (typeof bound?.onUpdate === "function") bound.onUpdate(decorate(latest));
    }
    return decorate(latest);
  })();
  latest = { ...latest, status: "scanning" };
  return decorate(latest);
}

function startAuto(deps) {
  bind(deps);
  if (process.env.SHIELD_MACHINE_SCAN === "0") {
    latest = emptyResult("idle");
    return decorate(latest);
  }
  void runBound();
  return decorate(latest);
}

function requestRun() {
  void runBound();
  return decorate(latest.status === "idle" ? { ...latest, status: "scanning" } : latest);
}

function publicView() {
  return decorate(latest);
}

/** First-open Skip: drop prior ready/error so Scan again is Halt primary on idle. */
function resetToIdle() {
  latest = emptyResult("idle");
  return decorate(latest);
}

function findingsForBlock() {
  return fullFindings.slice();
}

module.exports = {
  LIMITS,
  bind,
  createSession,
  findingsForBlock,
  publicView,
  requestContinue,
  requestRun,
  resetToIdle,
  scanMachine,
  startAuto
};
