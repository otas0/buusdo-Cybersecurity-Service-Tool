import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const packsDir = join(root, "i18n/packs");
const en = JSON.parse(readFileSync(join(packsDir, "_en.snapshot.json"), "utf8")) as Record<
  string,
  string
>;

function placeholders(s: string): string[] {
  return [...s.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]).sort();
}

test("every locale pack preserves EN {placeholder} tokens per key", () => {
  const files = readdirSync(packsDir).filter(
    (f) => f.endsWith(".json") && !f.startsWith("_")
  );
  assert.ok(files.length > 10);
  const mismatches: string[] = [];
  for (const file of files) {
    const pack = JSON.parse(readFileSync(join(packsDir, file), "utf8")) as Record<string, string>;
    for (const [key, enVal] of Object.entries(en)) {
      const val = pack[key];
      if (!val?.trim()) continue;
      const want = placeholders(enVal).join(",");
      const got = placeholders(val).join(",");
      if (want !== got) {
        mismatches.push(`${file}:${key} en={${want}} pack={${got}}`);
      }
    }
  }
  assert.equal(mismatches.length, 0, mismatches.slice(0, 20).join("\n"));
});

test("A4 poster keys preserve EN placeholders (incl. future {…} on hint)", () => {
  const a4Keys = ["downloadA4Poster", "downloadA4PosterShort", "downloadA4PosterHint"] as const;
  for (const key of a4Keys) {
    assert.ok(en[key]?.trim(), `EN missing ${key}`);
  }
  const files = readdirSync(packsDir).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  for (const file of files) {
    const pack = JSON.parse(readFileSync(join(packsDir, file), "utf8")) as Record<string, string>;
    for (const key of a4Keys) {
      const val = pack[key];
      if (!val?.trim()) continue;
      assert.deepEqual(
        placeholders(val),
        placeholders(en[key]),
        `${file}:${key} placeholder drift`
      );
    }
  }
});
