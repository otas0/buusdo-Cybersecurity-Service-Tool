/**
 * Persist personal block/trust lists (shield-lists-v1) on disk for the desktop app.
 * Default path: desktop-app/data/shield-backup.json (or SHIELD_LISTS_PATH).
 * Syncthing-friendly: watch that file across machines.
 */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const DEFAULT_PATH = path.resolve(__dirname, "../data/shield-backup.json");

let listsMod = null;
let cache = null;

async function loadMod() {
  if (listsMod) return listsMod;
  const href = pathToFileURL(path.resolve(__dirname, "../../shared/shield-lists.mjs")).href;
  listsMod = await import(href);
  return listsMod;
}

function listsPath() {
  return process.env.SHIELD_LISTS_PATH
    ? path.resolve(process.env.SHIELD_LISTS_PATH)
    : DEFAULT_PATH;
}

/** File mtime (ms since epoch) for Syncthing operators; null if missing. */
function listsMtimeMs() {
  try {
    return fs.statSync(listsPath()).mtimeMs;
  } catch {
    return null;
  }
}

async function readLists() {
  const mod = await loadMod();
  const file = listsPath();
  try {
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, "utf8"));
      cache = mod.parseBackup(raw);
      return cache;
    }
  } catch (err) {
    console.warn("[desktop] lists read failed", err.message);
  }
  cache = mod.emptyLists();
  return cache;
}

async function writeLists(lists) {
  const mod = await loadMod();
  const next = mod.parseBackup(lists);
  const file = listsPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, mod.serializeBackup(next), "utf8");
  cache = next;
  return next;
}

/** Empty personal lists file (privacy Never store confirm). */
async function clearListsFile() {
  const mod = await loadMod();
  return writeLists(mod.emptyLists());
}

async function getLists() {
  if (cache) return cache;
  return readLists();
}

/** Sync peek for classify path (null until first read/write). */
function peekCache() {
  return cache;
}

let watchStarted = false;
let watchTimer = null;
/** @type {Set<(lists: object) => void>} */
const watchListeners = new Set();

/**
 * Watch shield-backup.json for Syncthing / external edits; reload cache.
 * Debounced so our own writes do not thrash.
 */
function startListsWatch() {
  if (watchStarted) return;
  watchStarted = true;
  const file = listsPath();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    // Watch the parent directory so Syncthing create/replace still fires before the file exists.
    fs.watch(path.dirname(file), { persistent: false }, (_evt, name) => {
      if (name && name !== path.basename(file)) return;
      if (watchTimer) clearTimeout(watchTimer);
      watchTimer = setTimeout(() => {
        readLists()
          .then((lists) => {
            const meta = { mtimeMs: listsMtimeMs(), path: listsPath() };
            for (const fn of watchListeners) {
              try {
                fn(lists, meta);
              } catch (err) {
                console.warn("[desktop] lists watch listener", err.message);
              }
            }
          })
          .catch((err) => console.warn("[desktop] lists reload failed", err.message));
      }, 250);
    });
    console.log(`[desktop] Watching personal lists → ${file}`);
  } catch (err) {
    console.warn("[desktop] lists watch unavailable", err.message);
  }
}

function onListsChange(fn) {
  watchListeners.add(fn);
  return () => watchListeners.delete(fn);
}

module.exports = {
  listsPath,
  listsMtimeMs,
  readLists,
  writeLists,
  clearListsFile,
  getLists,
  peekCache,
  loadMod,
  startListsWatch,
  onListsChange
};