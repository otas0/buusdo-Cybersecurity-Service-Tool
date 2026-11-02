/**
 * Apply or undo a maximum block after the user answers the machine-scan question.
 * Hosts go on the personal list. User-owned files move into local quarantine.
 * System paths are refused even if a finding names them.
 */

const fs = require("fs");
const path = require("path");
const listsStore = require("./lists-store");
const { isProtectedSystemPath, isUnder } = require("./machine-paths");

function dataDir() {
  return path.dirname(listsStore.listsPath());
}

function decisionPath() {
  return process.env.SHIELD_MACHINE_DECISION_PATH
    ? path.resolve(process.env.SHIELD_MACHINE_DECISION_PATH)
    : path.join(dataDir(), "machine-decision.json");
}

function quarantineRoot() {
  return process.env.SHIELD_QUARANTINE_PATH
    ? path.resolve(process.env.SHIELD_QUARANTINE_PATH)
    : path.join(dataDir(), "quarantine");
}

function manifestPath() {
  return path.join(quarantineRoot(), "manifest.json");
}

function readDecision() {
  try {
    const data = JSON.parse(fs.readFileSync(decisionPath(), "utf8"));
    if (!data || typeof data !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

function saveDecision(decision) {
  fs.mkdirSync(path.dirname(decisionPath()), { recursive: true });
  fs.writeFileSync(decisionPath(), `${JSON.stringify(decision, null, 2)}\n`, "utf8");
  return decision;
}

function clearDecision() {
  try {
    fs.unlinkSync(decisionPath());
  } catch {
    /* absent */
  }
}

function readManifest() {
  try {
    const data = JSON.parse(fs.readFileSync(manifestPath(), "utf8"));
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      hosts: Array.isArray(data?.hosts) ? data.hosts : []
    };
  } catch {
    return { items: [], hosts: [] };
  }
}

function writeManifest(manifest) {
  fs.mkdirSync(quarantineRoot(), { recursive: true });
  fs.writeFileSync(manifestPath(), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function quarantineCount() {
  return readManifest().items.length;
}

function listQuarantine() {
  return readManifest().items.map((item) => ({
    from: item.from,
    requested: item.requested || item.from,
    error: item.error || null
  }));
}

async function moveFile(from, to) {
  await fs.promises.mkdir(path.dirname(to), { recursive: true });
  try {
    await fs.promises.rename(from, to);
  } catch (err) {
    if (err && err.code === "EXDEV") {
      await fs.promises.copyFile(from, to);
      await fs.promises.unlink(from);
      return;
    }
    throw err;
  }
}

function productRoots() {
  return [
    path.resolve(__dirname, ".."),
    path.resolve(__dirname, "..", "..")
  ];
}

/**
 * @param {Array<{ id?: string, enforceable?: string, path?: string, host?: string, reason?: string }>} findings
 */
async function applyMaximum(findings) {
  const mod = await listsStore.loadMod();
  let lists = await listsStore.getLists();
  const hostsAdded = [];
  const alreadyBlocked = [];
  const skippedTrusted = [];
  const quarantined = [];
  const skipped = [];
  const errors = [];
  const moved = new Set();
  const manifest = readManifest();
  const qRoot = quarantineRoot();

  for (const finding of findings || []) {
    if (finding?.enforceable !== "quarantine" || !finding.path) continue;
    let real = path.resolve(finding.path);
    try {
      real = await fs.promises.realpath(finding.path);
    } catch {
      skipped.push({ path: finding.path, reason: "missing" });
      continue;
    }
    if (moved.has(real)) continue;
    if (isProtectedSystemPath(real) || isUnder(real, qRoot) || productRoots().some((root) => isUnder(real, root))) {
      skipped.push({ path: real, reason: "protected" });
      continue;
    }
    let stat;
    try {
      stat = await fs.promises.stat(real);
    } catch {
      skipped.push({ path: real, reason: "missing" });
      continue;
    }
    if (!stat.isFile()) {
      skipped.push({ path: real, reason: "not-file" });
      continue;
    }
    const dest = path.join(qRoot, finding.id || "item", path.basename(real));
    try {
      await moveFile(real, dest);
      moved.add(real);
      const item = {
        id: finding.id || path.basename(real),
        from: real,
        requested: path.resolve(finding.path),
        to: dest,
        at: new Date().toISOString(),
        error: null
      };
      manifest.items.push(item);
      quarantined.push(item);
    } catch (err) {
      errors.push({ path: real, error: err instanceof Error ? err.message : "quarantine-failed" });
    }
  }

  const hostSet = new Set();
  for (const finding of findings || []) {
    if (finding?.enforceable !== "block-host" || !finding.host) continue;
    let host;
    try {
      host = mod.normalizeListHost(finding.host);
    } catch {
      continue;
    }
    if (hostSet.has(host)) continue;
    hostSet.add(host);
    if (mod.isDomainTrustedInLists(lists, host)) {
      skippedTrusted.push(host);
      continue;
    }
    if (mod.isDomainBlockedInLists(lists, host)) {
      alreadyBlocked.push(host);
      continue;
    }
    lists = mod.addBlocked(lists, host, "machine-scan");
    hostsAdded.push(host);
  }

  if (hostsAdded.length) {
    lists = await listsStore.writeLists(lists);
    manifest.hosts = [...new Set([...(manifest.hosts || []), ...hostsAdded])];
  }
  if (quarantined.length || hostsAdded.length) writeManifest(manifest);

  const acted = hostsAdded.length + alreadyBlocked.length + quarantined.length > 0;
  return {
    ok: errors.length === 0 && acted,
    hostsAdded,
    alreadyBlocked,
    skippedTrusted,
    quarantined,
    skipped,
    errors,
    lists
  };
}

async function restoreAll() {
  const mod = await listsStore.loadMod();
  let lists = await listsStore.getLists();
  const manifest = readManifest();
  const restored = [];
  const errors = [];
  const remain = [];

  for (const item of manifest.items) {
    try {
      await fs.promises.access(item.to);
    } catch {
      const kept = { ...item, error: "missing-quarantine" };
      errors.push({ path: item.from, error: kept.error });
      remain.push(kept);
      continue;
    }
    try {
      await fs.promises.access(item.from);
      const kept = { ...item, error: "destination-exists" };
      errors.push({ path: item.from, error: kept.error });
      remain.push(kept);
      continue;
    } catch {
      /* original path is free */
    }
    try {
      await moveFile(item.to, item.from);
      restored.push(item.from);
      try {
        await fs.promises.rm(path.dirname(item.to), { recursive: true, force: true });
      } catch {
        /* directory cleanup is best-effort */
      }
    } catch {
      const kept = { ...item, error: "restore-failed" };
      errors.push({ path: item.from, error: kept.error });
      remain.push(kept);
    }
  }

  const removedHosts = [];
  for (const host of manifest.hosts || []) {
    const entry = (lists.blocked || []).find((item) => item.domain === host);
    if (entry && entry.reason === "machine-scan") {
      lists = mod.removeDomain(lists, host);
      removedHosts.push(host);
    }
  }
  if (removedHosts.length) lists = await listsStore.writeLists(lists);

  const next = { items: remain, hosts: (manifest.hosts || []).filter((host) => !removedHosts.includes(host)) };
  if (next.items.length || next.hosts.length) writeManifest(next);
  else {
    try {
      fs.rmSync(quarantineRoot(), { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
  if (restored.length || removedHosts.length) clearDecision();
  return { ok: errors.length === 0, restored, removedHosts, errors, lists };
}

module.exports = {
  applyMaximum,
  clearDecision,
  decisionPath,
  listQuarantine,
  quarantineCount,
  quarantineRoot,
  readDecision,
  restoreAll,
  saveDecision
};