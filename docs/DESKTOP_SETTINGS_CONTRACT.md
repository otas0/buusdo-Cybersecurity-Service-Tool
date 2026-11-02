# Desktop `/api/settings` contract

Local dashboard only (`desktop-app` Express). Not part of the website OpenAPI (`docs/openapi-check-timing.yaml`).

## `GET /api/settings`

### Response `200`

```yaml
paths:
  /api/settings:
    get:
      summary: Read settings.json + honest-limits pending flag
      responses:
        "200":
          description: Current settings
          content:
            application/json:
              schema:
                type: object
                required: [ok, settings, honestLimitsPending, dataDir]
                properties:
                  ok: { type: boolean, const: true }
                  honestLimitsPending: { type: boolean }
                  dataDir: { type: string }
                  settings:
                    type: object
                    required: [openAtLogin]
                    properties:
                      openAtLogin: { type: boolean }
                      honestLimitsAckAt:
                        type: string
                        format: date-time
                        nullable: true
                      honestLimitsSkippedAt:
                        type: string
                        format: date-time
                        nullable: true
```

## `PUT /api/settings`

Body (JSON):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `openAtLogin` | boolean | yes | Writes/clears the OS login item. |

### Response `200`

```yaml
# OpenAPI-style snippet (desktop-local; not published on Workers)
paths:
  /api/settings:
    put:
      summary: Update open-at-login (merges settings.json)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [openAtLogin]
              properties:
                openAtLogin: { type: boolean }
      responses:
        "200":
          description: Settings after merge
          content:
            application/json:
              schema:
                type: object
                required: [ok, settings]
                properties:
                  ok: { type: boolean, const: true }
                  settings:
                    type: object
                    required: [openAtLogin]
                    properties:
                      openAtLogin: { type: boolean }
                      # Preserved across openAtLogin writes — never dropped by PUT.
                      honestLimitsAckAt:
                        type: string
                        format: date-time
                        nullable: true
                        description: ISO stamp when the user acked first-open honest limits
                      honestLimitsSkippedAt:
                        type: string
                        format: date-time
                        nullable: true
                  applied:
                    type: object
                    properties:
                      ok: { type: boolean }
                      enabled: { type: boolean }
                      path: { type: string }
```

`honestLimitsAckAt` / `honestLimitsSkippedAt` are **read-only** on PUT (set only via `/api/honest-limits/*`). PUT must echo the prior stamps unchanged — covered by `smoke:desktop-first-open` and `tests/desktop-honest-limits-diagnostics.test.ts`. Silent install (`install.js`) only toggles `openAtLogin` via merge and must not clear these stamps.

## `/api/honest-limits/*` (first-open gate)

| Method | Path | Effect |
|--------|------|--------|
| `POST` | `/api/honest-limits/ack` | Sets `honestLimitsAckAt`, clears skip, starts machine scan |
| `POST` | `/api/honest-limits/skip` | Sets `honestLimitsSkippedAt`, clears ack, leaves scan idle |
| `POST` | `/api/honest-limits/reset` | Clears both stamps → gate pending again |

### Response shape (ack / skip / reset)

```yaml
paths:
  /api/honest-limits/ack:
    post:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                required: [ok, settings, honestLimitsPending]
                properties:
                  ok: { type: boolean, const: true }
                  honestLimitsPending: { type: boolean }
                  settings:
                    type: object
                    properties:
                      openAtLogin: { type: boolean }
                      honestLimitsAckAt: { type: string, format: date-time, nullable: true }
                      honestLimitsSkippedAt: { type: string, format: date-time, nullable: true }
                  scan: { type: object, description: "machine-scan publicView (ack/skip)" }
```

Env bypass for smokes only: `SHIELD_HONEST_LIMITS=0` (never set in production installers).