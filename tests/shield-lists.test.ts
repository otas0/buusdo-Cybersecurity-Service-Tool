import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import {
  SHIELD_LISTS_SCHEMA,
  PERSONAL_DNR_RULE_LIMIT,
  addBlocked,
  addTrusted,
  backupDownloadName,
  QR_ZLIB_PREFIX,
  compactPayloadForQr,
  emptyLists,
  expandQrOrBackup,
  mergeBackups,
  normalizeListHost,
  parseBackup,
  removeDomain,
  serializeBackup,
  stripJsonTrailingCommas
} from "../shared/shield-lists.mjs";

const require = createRequire(import.meta.url);

test("normalizeListHost strips www and scheme", () => {
  assert.equal(normalizeListHost("https://WWW.Evil.Example/path"), "evil.example");
});

test("parseBackup + serializeBackup round-trip shield-lists-v1", () => {
  const raw = {
    schema: SHIELD_LISTS_SCHEMA,
    updatedAt: "2026-10-25T12:00:00.000Z",
    blocked: [{ domain: "bad.example", reason: "user" }],
    trusted: [{ domain: "ok.example" }]
  };
  const parsed = parseBackup(raw);
  assert.equal(parsed.blocked[0].domain, "bad.example");
  assert.equal(parsed.trusted[0].domain, "ok.example");
  const again = parseBackup(serializeBackup(parsed));
  assert.deepEqual(
    again.blocked.map((e) => e.domain),
    ["bad.example"]
  );
});

test("mergeBackups: import wins domain; block beats trust", () => {
  const cur = addTrusted(emptyLists(), "both.example");
  const incoming = addBlocked(emptyLists(), "both.example");
  const merged = mergeBackups(cur, incoming);
  assert.ok(merged.blocked.some((e) => e.domain === "both.example"));
  assert.ok(!merged.trusted.some((e) => e.domain === "both.example"));
});

test("removeDomain clears both lists", () => {
  let lists = addBlocked(emptyLists(), "x.example");
  lists = removeDomain(lists, "x.example");
  assert.equal(lists.blocked.length, 0);
});

test("compactPayloadForQr is dense domains-only and truncates", () => {
  let lists = addBlocked(emptyLists(), "b0.example");
  for (let i = 1; i < 5; i++) {
    lists = addBlocked(lists, `b${i}.example`);
  }
  const compact = JSON.parse(compactPayloadForQr(lists, 3));
  assert.ok(!("schema" in compact));
  assert.equal(compact.b.length, 3);
  const expanded = expandQrOrBackup(compact);
  assert.equal(expanded.schema, SHIELD_LISTS_SCHEMA);
  assert.equal(expanded.blocked.length, 3);
});

test("expandQrOrBackup accepts full shield-lists-v1", () => {
  const full = expandQrOrBackup({
    schema: SHIELD_LISTS_SCHEMA,
    updatedAt: "2026-10-25T12:00:00.000Z",
    blocked: [{ domain: "full.example" }],
    trusted: []
  });
  assert.equal(full.blocked[0].domain, "full.example");
});

test("expandQrOrBackup rejects garbage with stable invalid-backup", () => {
  for (const bad of [null, undefined, "", "not-json", 42, [], { nope: true }, "{broken"]) {
    assert.throws(() => expandQrOrBackup(bad as never), /invalid-backup/);
  }
});

test("expandQrOrBackup accepts pretty-printed dense JSON with trailing commas", () => {
  const pretty = `{
  "b": [
    "pretty.example",
  ],
  "t": [],
}`;
  const lists = expandQrOrBackup(pretty);
  assert.equal(lists.blocked[0].domain, "pretty.example");
});

test("expandQrOrBackup accepts pretty-printed full shield-lists-v1 with trailing commas", () => {
  const pretty = `{
  "schema": "${SHIELD_LISTS_SCHEMA}",
  "updatedAt": "2026-10-25T12:00:00.000Z",
  "blocked": [
    { "domain": "full-pretty.example", "reason": "user", },
  ],
  "trusted": [
    { "domain": "ok-pretty.example", },
  ],
}`;
  const lists = expandQrOrBackup(pretty);
  assert.equal(lists.blocked[0].domain, "full-pretty.example");
  assert.equal(lists.trusted[0].domain, "ok-pretty.example");
});

test("stripJsonTrailingCommas fuzz nested arrays and objects", () => {
  const cases = [
    "[1, 2,]",
    '{"a": [1, 2,],}',
    '{"a": {"b": [1,],},}',
    '[[1,], [2, 3,],]',
    '{"b": ["x.example",], "t": ["y.example",],}',
    '{"outer": [{"inner": [1, 2,],},],}'
  ];
  for (const raw of cases) {
    const stripped = stripJsonTrailingCommas(raw);
    assert.doesNotThrow(() => JSON.parse(stripped), raw);
  }
  // Commas inside string values must survive
  assert.equal(JSON.parse(stripJsonTrailingCommas('{"s": "a,]",}')).s, "a,]");
  assert.equal(JSON.parse(stripJsonTrailingCommas('{"s": "x,}",}')).s, "x,}");
});

test("classic stripJsonTrailingCommas matches mjs for commas inside strings", () => {
  require("../shared/shield-lists.classic.js");
  const classic = (globalThis as { ShieldLists?: { stripJsonTrailingCommas: (s: string) => string } })
    .ShieldLists;
  assert.ok(classic?.stripJsonTrailingCommas);
  const raw = '{"s": "a,]", "b": [1, 2,],}';
  assert.equal(classic!.stripJsonTrailingCommas(raw), stripJsonTrailingCommas(raw));
  assert.equal(JSON.parse(classic!.stripJsonTrailingCommas(raw)).s, "a,]");
});

test("compactPayloadForQr zlib mode round-trips via expandQrOrBackup", () => {
  const lists = addBlocked(emptyLists(), "z.example");
  const z = compactPayloadForQr(lists, 40, { zlib: true });
  assert.ok(z.startsWith(QR_ZLIB_PREFIX));
  const back = expandQrOrBackup(z);
  assert.equal(back.blocked[0].domain, "z.example");
});

test("backupDownloadName includes UTC date", () => {
  assert.equal(backupDownloadName(new Date("2026-10-25T12:00:00.000Z")), "shield-backup-2026-10-25.json");
  assert.equal(PERSONAL_DNR_RULE_LIMIT, 500);
});

test("classic ShieldLists parses the same fixture as mjs", () => {
  require("../shared/shield-lists.classic.js");
  const classic = (globalThis as { ShieldLists?: typeof import("../shared/shield-lists.mjs") }).ShieldLists;
  assert.ok(classic);
  const fixture = {
    schema: SHIELD_LISTS_SCHEMA,
    updatedAt: "2026-10-25T12:00:00.000Z",
    blocked: [{ domain: "classic.example", reason: "user" }],
    trusted: [{ domain: "ok.example" }]
  };
  const fromClassic = classic!.parseBackup(fixture);
  const fromMjs = parseBackup(fixture);
  assert.deepEqual(
    fromClassic.blocked.map((e) => e.domain),
    fromMjs.blocked.map((e) => e.domain)
  );
  assert.match(classic!.backupDownloadName(new Date("2026-10-25T00:00:00.000Z")), /shield-backup-2026-10-25\.json/);
});