# `shield-lists-v1` — personal block / trust backup

Portable JSON for the **browser extension** and **desktop app**. The website does **not** store or enforce these lists.

## Schema

```json
{
  "schema": "shield-lists-v1",
  "updatedAt": "2026-10-25T12:00:00.000Z",
  "blocked": [
    { "domain": "bad.example", "reason": "user", "createdAt": "2026-10-25T12:00:00.000Z" }
  ],
  "trusted": [
    { "domain": "ok.example", "createdAt": "2026-10-25T12:00:00.000Z" }
  ]
}
```

| Field | Type | Notes |
|-------|------|--------|
| `schema` | string | Always `"shield-lists-v1"` |
| `updatedAt` | string | ISO-8601 |
| `blocked` | array | Domains the user wants refused (extension DNR / desktop proxy) |
| `trusted` | array | Domains the user marked safe (suppress soft phishing signals where applicable) |
| `blocked[].domain` | string | Registrable-style host, lowercase, no `www.` |
| `blocked[].reason` | string | Optional short tag (never a full URL with secrets) |
| `blocked[].createdAt` | string | ISO-8601 |
| `trusted[].domain` | string | Same host rules as blocked |
| `trusted[].createdAt` | string | ISO-8601 |

Shared helpers: [`shield-lists.mjs`](./shield-lists.mjs) (`parseBackup`, `serializeBackup`, `mergeBackups`, `compactPayloadForQr`, `expandQrOrBackup`, `stripJsonTrailingCommas`, `backupDownloadName`).

**Pretty-printed backups:** `expandQrOrBackup` / `stripJsonTrailingCommas` accept trailing commas after array/object members. The stripper is string-safe (commas inside JSON string values are never removed). Parity: `tests/shield-lists.test.ts` (“classic stripJsonTrailingCommas matches mjs for commas inside strings”) covers `shield-lists.mjs` and `shield-lists.classic.js`.

Extension DNR applies at most **500** personal block hosts (`PERSONAL_DNR_RULE_LIMIT`); export still keeps the full list.

## Free sync

Export (dated `shield-backup-YYYY-MM-DD.json`) → copy file (USB, free Drive/iCloud, Syncthing watching `desktop-app/data/shield-backup.json` or `SHIELD_LISTS_PATH`) → import on the other surface. Desktop watches the **parent directory** (Syncthing atomic replace) and emits SSE `lists` (API+watch debounced). Optional on-canvas QR for ≤40 hosts (`shared/qrcode-browser.js`, no CDN); regenerate with `npm run qr:bundle` if needed.

**Dense QR payload** (phone scan): `{"b":["bad.example"],"t":["ok.example"]}` — domains only. Import via `expandQrOrBackup` (also accepts full `shield-lists-v1`).

**Zlib mode** (optional, when cameras fail on long JSON): `compactPayloadForQr(lists, 40, { zlib: true })` → `ZB1:<base64>` (Node/desktop). Decode with the same `expandQrOrBackup` / browser `expandQrOrBackupAsync`. Garbage input always throws the stable code `invalid-backup`.

Phone flow: show/copy dense QR → scan or paste → extension **Paste QR / dense JSON** or desktop Import. See [`extension/README.md`](../extension/README.md).

### Screenshot path (phone → extension paste)

1. Desktop Personal lists → **Show QR** (optional **Zlib QR** for denser codes) → phone camera reads the canvas.
2. Phone copies the decoded text (or Notes → copy).
3. Extension popup → Data ≠ Never → **Paste QR / dense JSON** (or Safari fallback textarea if clipboard is denied) → Blocked column flashes when import succeeds.
4. Optional still: export dated `shield-backup-YYYY-MM-DD.json` for USB / Syncthing instead of QR.