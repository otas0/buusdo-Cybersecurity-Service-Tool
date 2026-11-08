import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { GET } from "../app/api/health/route";

test("GET /api/health JSON builder always includes personalHintLogEnabled + Env", () => {
  const src = readFileSync(join(process.cwd(), "app/api/health/route.ts"), "utf8");
  assert.match(src, /personalHintLogEnabled/);
  assert.match(src, /personalHintLogEnv:\s*"CHECK_PERSONAL_HINT_LOG"/);
  assert.match(src, /CHECK_PERSONAL_HINT_LOG\s*!==\s*"0"/);
  assert.match(
    src,
    /personalHintLogEnabled,\s*\n\s*personalHintLogEnv:\s*"CHECK_PERSONAL_HINT_LOG"/
  );
  // Payload may grow; unset/0/1 truth table must stay "only exact 0 disables".
  assert.doesNotMatch(src, /CHECK_PERSONAL_HINT_LOG\s*===\s*"1"/);
  assert.doesNotMatch(src, /CHECK_PERSONAL_HINT_LOG\s*\|\|/);
});

test(".env.example documents CHECK_PERSONAL_HINT_LOG unset / 0 / 1 matrix", () => {
  const envEx = readFileSync(join(process.cwd(), ".env.example"), "utf8");
  assert.match(envEx, /unset → true/);
  assert.match(envEx, /CHECK_PERSONAL_HINT_LOG=0 → false/);
  assert.match(envEx, /CHECK_PERSONAL_HINT_LOG=1 → true/);
  const route = readFileSync(join(process.cwd(), "app/api/health/route.ts"), "utf8");
  // Keep health truth table aligned with .env.example: only exact "0" disables.
  assert.match(route, /CHECK_PERSONAL_HINT_LOG\s*!==\s*"0"/);
});

const HINT_LOG_CASES: Array<{ label: string; env: string | undefined; expected: boolean }> = [
  { label: "unset", env: undefined, expected: true },
  { label: '"0"', env: "0", expected: false },
  { label: '"1"', env: "1", expected: true }
];

/**
 * Fixed allowlist — when health payload grows, extend this set intentionally.
 * Next health growth after 1.5.2: bump OpenAPI info patch + extend this allowlist +
 * keep both timingSchemaFail* keys asserted by name below + npm run openapi:sync.
 */
const HEALTH_JSON_ALLOWLIST = new Set([
  "ok",
  "service",
  "threatIntel",
  "thirdPartyReputation",
  "curatedListPresent",
  "localeCount",
  "regionCount",
  "localesByRegion",
  "ownThreatMergePt",
  "ownThreatMergePtEnv",
  "probeTimeoutMs",
  "probeTimeoutEnv",
  "probeTimeoutFormula",
  "probeTimeoutHint",
  "probeTimeoutSuggestion",
  "headSkipDomains",
  "headSkipEntries",
  "personalHintLogEnabled",
  "personalHintLogEnv",
  "accountSyncEnabled",
  "accountSyncEnabledEnv",
  "accountSyncRequireTurso",
  "accountSyncRequireTursoEnv",
  "accountSyncTursoConfigured",
  "checkedAt",
  "listenHint",
  "pollMs",
  "timingSchemaFailCounts",
  "timingSchemaFailCountsEnv"
]);

const HEALTH_ALLOWLIST_HINT = `extend HEALTH_JSON_ALLOWLIST in tests/health-personal-hint-log.test.ts (allowlist size ${HEALTH_JSON_ALLOWLIST.size})`;

test("HEALTH_JSON_ALLOWLIST size is at least 19", () => {
  assert.ok(
    HEALTH_JSON_ALLOWLIST.size >= 19,
    `allowlist size ${HEALTH_JSON_ALLOWLIST.size} < 19 — ${HEALTH_ALLOWLIST_HINT}`
  );
});

test("HEALTH_JSON_ALLOWLIST includes both timingSchemaFail* keys by name", () => {
  assert.ok(
    HEALTH_JSON_ALLOWLIST.has("timingSchemaFailCounts"),
    `missing timingSchemaFailCounts — ${HEALTH_ALLOWLIST_HINT}`
  );
  assert.ok(
    HEALTH_JSON_ALLOWLIST.has("timingSchemaFailCountsEnv"),
    `missing timingSchemaFailCountsEnv — ${HEALTH_ALLOWLIST_HINT}`
  );
});

test("HEALTH_JSON_ALLOWLIST includes accountSyncEnabled* keys by name", () => {
  assert.ok(
    HEALTH_JSON_ALLOWLIST.has("accountSyncEnabled"),
    `missing accountSyncEnabled — ${HEALTH_ALLOWLIST_HINT}`
  );
  assert.ok(
    HEALTH_JSON_ALLOWLIST.has("accountSyncEnabledEnv"),
    `missing accountSyncEnabledEnv — ${HEALTH_ALLOWLIST_HINT}`
  );
});

for (const row of HINT_LOG_CASES) {
  test(`GET /api/health personalHintLogEnabled when CHECK_PERSONAL_HINT_LOG is ${row.label}`, async () => {
    const prev = process.env.CHECK_PERSONAL_HINT_LOG;
    if (row.env === undefined) delete process.env.CHECK_PERSONAL_HINT_LOG;
    else process.env.CHECK_PERSONAL_HINT_LOG = row.env;
    try {
      const response = await GET(new Request("http://127.0.0.1/api/health"));
      assert.equal(response.status, 200);
      const body = (await response.json()) as {
        personalHintLogEnabled?: boolean;
        personalHintLogEnv?: string;
      };
      assert.equal(body.personalHintLogEnabled, row.expected);
      assert.equal(body.personalHintLogEnv, "CHECK_PERSONAL_HINT_LOG");
      for (const key of Object.keys(body)) {
        assert.ok(
          HEALTH_JSON_ALLOWLIST.has(key),
          `unexpected health key: ${key} — ${HEALTH_ALLOWLIST_HINT}`
        );
      }
      assert.ok("personalHintLogEnabled" in body);
      assert.ok("personalHintLogEnv" in body);
    } finally {
      if (prev === undefined) delete process.env.CHECK_PERSONAL_HINT_LOG;
      else process.env.CHECK_PERSONAL_HINT_LOG = prev;
    }
  });
}

test("GET /api/health JSON keys stay within fixed allowlist", async () => {
  const response = await GET(new Request("http://127.0.0.1/api/health?pollMs=15000"));
  assert.equal(response.status, 200);
  const body = (await response.json()) as Record<string, unknown>;
  for (const key of Object.keys(body)) {
    assert.ok(
      HEALTH_JSON_ALLOWLIST.has(key),
      `unexpected health key: ${key} — ${HEALTH_ALLOWLIST_HINT}`
    );
  }
  assert.equal(typeof body.pollMs, "number");
});

test("GET /api/health echoes timingSchemaFailCounts only when CHECK_TIMING_SCHEMA_FAIL_HEALTH=1", async () => {
  const prev = process.env.CHECK_TIMING_SCHEMA_FAIL_HEALTH;
  try {
    delete process.env.CHECK_TIMING_SCHEMA_FAIL_HEALTH;
    const off = (await (
      await GET(new Request("http://127.0.0.1/api/health"))
    ).json()) as Record<string, unknown>;
    assert.equal("timingSchemaFailCounts" in off, false);

    process.env.CHECK_TIMING_SCHEMA_FAIL_HEALTH = "1";
    const on = (await (
      await GET(new Request("http://127.0.0.1/api/health"))
    ).json()) as {
      timingSchemaFailCounts?: { ambiguousAbsent: number; ambiguousBoolean: number };
      timingSchemaFailCountsEnv?: string;
    };
    assert.ok(on.timingSchemaFailCounts);
    assert.equal(typeof on.timingSchemaFailCounts?.ambiguousAbsent, "number");
    assert.equal(typeof on.timingSchemaFailCounts?.ambiguousBoolean, "number");
    assert.equal(on.timingSchemaFailCountsEnv, "CHECK_TIMING_SCHEMA_FAIL_HEALTH");
    for (const key of Object.keys(on)) {
      assert.ok(
        HEALTH_JSON_ALLOWLIST.has(key),
        `unexpected health key: ${key} — ${HEALTH_ALLOWLIST_HINT}`
      );
    }
  } finally {
    if (prev === undefined) delete process.env.CHECK_TIMING_SCHEMA_FAIL_HEALTH;
    else process.env.CHECK_TIMING_SCHEMA_FAIL_HEALTH = prev;
  }
});