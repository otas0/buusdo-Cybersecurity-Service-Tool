# `/api/check` contract (website → clients)

First-party only. The website check endpoint never calls Google Safe Browsing or other third-party reputation APIs.

## Request

`POST /api/check`  
`Content-Type: application/json`

```json
{
  "url": "https://example.com/path",
  "skipHeadHosts": ["hostile.example"],
  "personalListBlocked": true
}
```

| Field | Required | Meaning |
|-------|----------|---------|
| `url` | yes | HTTP(S) address to check |
| `skipHeadHosts` | no | Registrable domains (max 50) that should skip HEAD on the first hop — from local history of repeated HEAD failures. Domains only; never full URLs. |
| `personalListBlocked` | no | Read-only hint from extension/desktop that the host is on the caller’s personal block list. When `true`, analysis may include evidence id `user-block`. **The website never stores or enforces personal lists** — this flag is not persisted and does not affect rate-limit keys. |

Also see OpenAPI **1.5.2** fragment: `docs/openapi-check-timing.yaml` (`personalListBlocked` is request-only and outside `CheckTiming`). When `personalListBlocked` is `true` and the rest of the check is only `LOW_EVIDENCE`, recommendation may be `LEAVE` (stronger levels keep their own recommendation).

**Examples:** OpenAPI response example `personalListBlockedLeave` under `POST /api/check` → `200` → `examples` in [`docs/openapi-check-timing.yaml`](./openapi-check-timing.yaml) (LEAVE + LOW_EVIDENCE + `user-block` evidence).

Operator soft notice: when `personalListBlocked: true` is accepted, the server may log the fixed line `[api/check] personalListBlocked hint accepted` (no URL). Set `CHECK_PERSONAL_HINT_LOG=0` to silence it. `GET /api/health` echoes `personalHintLogEnabled` (true unless that env is `"0"`).

## Success (200)

```json
{
  "ok": true,
  "timingValid": true,
  "analysis": {
    "parsed": { "...": "..." },
    "threat": { "state": "NO_KNOWN_MATCH", "providerName": "buusdo own threat list", "...": "..." },
    "identity": { "...": "..." },
    "risk": { "level": "LOW_EVIDENCE", "evidence": [], "...": "..." },
    "sensitive": null,
    "inferredOrganisationId": null,
    "live": { "timedOut": false, "redirectChain": [], "...": "..." },
    "timing": {
      "parseMs": 0,
      "threatMs": 1,
      "probeMs": 120,
      "riskMs": 1,
      "totalMs": 122,
      "probeTimeoutMs": 5000,
      "probeHeadFailed": false,
      "headSkipped": false,
      "ambiguousProbeStatus": false
    }
  }
}
```

Use `analysis.timing` for probe tuning (`docs/check-timing.schema.json`, OpenAPI 1.5.2 `docs/openapi-check-timing.yaml`). Health echoes `accountSyncEnabled` when account list-sync is gated (`ACCOUNT_SYNC_ENABLED`). `ambiguousProbeStatus` is `true` when the live probe got HTTP 403/429/503 (bot block / throttle) — paired with evidence id `probe-blocked`; it does not escalate risk. Use `analysis.live.timedOut` with `probe-timeout` evidence — never invent third-party reputation fields. Legacy evidence id `sensitive` aliases to `sensitive-path` (`security/evidence-ids.ts`). When the request sent `personalListBlocked: true`, `analysis.personalListBlocked` echoes `true` and `analysis.risk.evidence` may include id `user-block` (still no server-side list storage). With only `LOW_EVIDENCE` otherwise, `risk.recommendation` may be `LEAVE`.

## Operators FAQ — `probe-blocked` vs phishing

| Signal | Meaning | Risk escalate? |
|--------|---------|----------------|
| Evidence `probe-blocked` + `timing.ambiguousProbeStatus: true` | Live probe got HTTP **403 / 429 / 503** (bot block, throttle, or overload). The site refused the automated check. | **No** — stays limited evidence; not proof of phishing. |
| Evidence `http-status` with other 4xx/5xx (e.g. **404**) | Site answered with that status. | **Yes** — can raise **CAUTION** (only 403/429/503 are exempt). |
| Evidence `known-threat` | Address matched the first-party curated list. | **Yes** — phishing / malicious path. |

Controlled EVAL trio for diff reviewers: [EVAL-034 / 035 / 036](../evaluation/fixtures/README.md) (403 / 429 / 503 → `LOW_EVIDENCE` + `probe-blocked`).

### Operators note — PT merge lookalikes

When `OWN_THREAT_MERGE_PT=1`, curated Portugal seeds (`.example` hosts in `security/data/curated-threats.pt.json`) contribute `known-threat`. Diff reviewers: host / MERGE on-off map for **EVAL-045–048**, **EVAL-049–056**, and **EVAL-057–064** (full **EVAL-037–064** table) lives in [evaluation/fixtures/README.md](../evaluation/fixtures/README.md). Insurance/IRS batch source: [`security/data/batches/`](../security/data/batches/) (`pending-pt-insurance-irs` → `applied/` after `threat:apply --target=pt`).

When `POST /api/check` returns `500` `timing-schema-invalid` during a schema bump, the body may include `diagnostic.ambiguousProbeStatus` (`true` / `false` / `"absent"`) plus a short `hint` — mid-migration only; success responses do not add this field.

Server log (fixed strings only, never URL): each schema failure also prints  
`[api/check] diagnostic.ambiguousProbeStatus=…` and  
`[api/check] timing-schema-fail-count absent=N boolean=M`  
(process counters for mid-migration ops). Optionally set `CHECK_TIMING_SCHEMA_FAIL_HEALTH=1` so `GET /api/health` echoes `timingSchemaFailCounts` (`ambiguousAbsent` / `ambiguousBoolean`) — documented in [`.env.example`](../.env.example) (`CHECK_TIMING_SCHEMA_FAIL_HEALTH`).

## Errors

| Status | Body | Meaning |
|--------|------|---------|
| 400 | `{ ok:false, error:"url-required" }` | Missing URL |
| 400 | `{ ok:false, error:"personalListBlocked-must-be-boolean" }` | `personalListBlocked` present but not a boolean |
| 400 | `{ ok:false, error:"…" }` | Parse / check failure |
| 429 | `{ ok:false, error:"rate-limited", retryAfterSec }` | Rate limit — also sends `Retry-After` (see below) |
| 500 | `{ ok:false, error:"timing-schema-invalid", details, diagnostic? }` | Timing failed schema validation; `diagnostic.ambiguousProbeStatus` only on this failure path |

### 429 `Retry-After`

Responses include both JSON `retryAfterSec` and the HTTP `Retry-After` header (exposed via `Access-Control-Expose-Headers` for CORS).

`Retry-After` may be:

- **delta-seconds** — integer seconds until another check is allowed (e.g. `12`)
- **HTTP-date** — an IMF-fixdate; clients should treat a date slightly in the past (clock skew) as expired and fall back to a default wait

When header and JSON disagree by more than **2 seconds** (`|headerSec − jsonSec| > 2`),
clients **must prefer the header** (website AppShell uses `resolveRetryAfterSec` /
`retryAfterHeaderPreferred` and may log `rate-limited-header-preferred`).

## Related endpoints

### `GET /api/health`

Liveness + probe budget + HEAD-skip snapshot (no third-party calls).

```json
{
  "ok": true,
  "service": "buusdocst",
  "threatIntel": "own",
  "thirdPartyReputation": false,
  "ownThreatMergePt": true,
  "probeTimeoutMs": 5000,
  "headSkipDomains": [],
  "headSkipEntries": [{ "domain": "hostile.example", "fails": 3, "until": "2026-10-21T14:00:00.000Z" }],
  "personalHintLogEnabled": true,
  "personalHintLogEnv": "CHECK_PERSONAL_HINT_LOG",
  "checkedAt": "2026-10-21T12:00:00.000Z",
  "pollMs": 15000,
  "listenHint": "localhost:3000"
}
```

With `CHECK_TIMING_SCHEMA_FAIL_HEALTH=1` the same payload also includes  
`"timingSchemaFailCounts": { "ambiguousAbsent": 0, "ambiguousBoolean": 0 }, "timingSchemaFailCountsEnv": "CHECK_TIMING_SCHEMA_FAIL_HEALTH"`.

`pollMs` is an echo of `?pollMs=` (desktop sends `WEBSITE_HEALTH_POLL_MS`). Omitted when the query param is absent. `listenHint` is an operator hint (prefer `localhost` over `127.0.0.1`). `personalHintLogEnabled` is `true` unless `CHECK_PERSONAL_HINT_LOG=0`.

Desktop probes `WEBSITE_CHECK_URL/api/health` before enabling website-check.

### `POST /api/head-skip/clear`

Clears the server HEAD-skip domain cache. Returns `{ ok: true, headSkipDomains: [], headSkipEntries: [] }`.

OpenAPI: `docs/openapi-check-timing.yaml` (paths `/api/check`, `/api/health`, `/api/head-skip/clear`).

## Extension note

The browser extension may call this contract read-only against a configured website origin (localhost or production base after optional host permission). Still no third-party reputation APIs.