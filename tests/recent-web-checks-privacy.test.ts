import assert from "node:assert/strict";
import test from "node:test";

const KEY = "shieldRecentWebChecks";

/** Mirrors dashboard Never-store branch for recent web checks (hostname rows only). */
function persistRecentWebChecks(
  rows: Array<{ host: string; level: string; at: string }>,
  privacyMode: string,
  storage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void }
) {
  if (privacyMode === "off") {
    storage.removeItem(KEY);
    return;
  }
  storage.setItem(KEY, JSON.stringify(rows));
}

test("Never store clears sessionStorage key", () => {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    }
  };
  storage.setItem(KEY, JSON.stringify([{ host: "a.example", level: "HIGH", at: "1" }]));
  persistRecentWebChecks([{ host: "b.example", level: "LOW", at: "2" }], "off", storage);
  assert.equal(storage.getItem(KEY), null);
});

test("local privacy keeps hostname rows only", () => {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    }
  };
  const rows = [{ host: "b.example", level: "CAUTION", at: "2" }];
  persistRecentWebChecks(rows, "local", storage);
  const raw = storage.getItem(KEY);
  assert.ok(raw);
  const parsed = JSON.parse(raw);
  assert.equal(parsed[0].host, "b.example");
  assert.equal(Object.keys(parsed[0]).sort().join(","), "at,host,level");
});