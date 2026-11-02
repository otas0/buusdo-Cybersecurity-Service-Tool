/**
 * One desktop process owns :3010 and :8080.
 * Lock file under the user data directory; stale PID files are cleared.
 */

const fs = require("fs");
const net = require("net");
const path = require("path");
const { ensureDataDir } = require("./user-data");

/** Log stale-lock reclaim at most once per process (operators / nightly diagnosis). */
let reclaimLogged = false;

function lockPath() {
  return process.env.SHIELD_INSTANCE_LOCK
    ? path.resolve(process.env.SHIELD_INSTANCE_LOCK)
    : path.join(ensureDataDir(), "instance.lock");
}

function readLock() {
  try {
    const raw = fs.readFileSync(lockPath(), "utf8").trim();
    const pid = Number(raw);
    if (!Number.isFinite(pid) || pid <= 0) return null;
    return { pid, file: lockPath() };
  } catch {
    return null;
  }
}

function pidAlive(pid) {
  if (!pid || pid === process.pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err && err.code === "EPERM";
  }
}

function portOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.setTimeout(400, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

/**
 * Clear a lock whose PID is dead (SIGKILL / crash) or clearly not our app.
 * @param {number} [depth]
 * @returns {{ ok: true, file: string, reentrant?: boolean } | { ok: false, reason: string, pid?: number }}
 */
function tryAcquire(depth = 0) {
  if (depth > 4) {
    return { ok: false, reason: "lock-retry-exhausted" };
  }
  const file = lockPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const existing = readLock();
  if (existing) {
    if (existing.pid === process.pid) return { ok: true, file, reentrant: true };
    if (pidAlive(existing.pid)) {
      return { ok: false, reason: "other-instance", pid: existing.pid };
    }
    // Stale PID after SIGKILL / abrupt exit — reclaim.
    try {
      fs.unlinkSync(file);
    } catch {
      /* absent */
    }
  }
  try {
    const fd = fs.openSync(file, "wx");
    fs.writeFileSync(fd, `${process.pid}\n`, "utf8");
    fs.closeSync(fd);
    return { ok: true, file };
  } catch (err) {
    if (err && err.code === "EEXIST") {
      const again = readLock();
      if (again && again.pid === process.pid) return { ok: true, file, reentrant: true };
      if (again && pidAlive(again.pid)) {
        return { ok: false, reason: "other-instance", pid: again.pid };
      }
      try {
        fs.unlinkSync(file);
      } catch {
        /* ignore */
      }
      return tryAcquire(depth + 1);
    }
    return { ok: false, reason: err instanceof Error ? err.message : "lock-failed" };
  }
}

/**
 * If the lock names a live PID but neither UI nor proxy port answers, reclaim
 * (PID reuse after SIGKILL, or crashed peer that left a zombie lock).
 * @param {{ uiPort: number, proxyPort: number }} ports
 */
async function tryAcquireOrReclaimStale(ports) {
  const first = tryAcquire();
  if (first.ok) return first;
  if (first.reason !== "other-instance") return first;
  const uiBusy =
    (await portOpen(ports.uiPort, "127.0.0.1")) || (await portOpen(ports.uiPort, "::1"));
  const proxyBusy = await portOpen(ports.proxyPort, "127.0.0.1");
  if (uiBusy || proxyBusy) return first;
  if (!reclaimLogged) {
    reclaimLogged = true;
    console.log(
      `[desktop] Reclaimed stale instance lock (pid ${first.pid ?? "?"}; UI/proxy ports free after SIGKILL or crash)`
    );
  }
  try {
    fs.unlinkSync(lockPath());
  } catch {
    /* absent */
  }
  return tryAcquire();
}

function release() {
  const file = lockPath();
  try {
    const existing = readLock();
    if (existing && existing.pid !== process.pid) return;
    fs.unlinkSync(file);
  } catch {
    /* absent */
  }
}

module.exports = {
  lockPath,
  tryAcquire,
  tryAcquireOrReclaimStale,
  release,
  pidAlive,
  portOpen,
  readLock
};