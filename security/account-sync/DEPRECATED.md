# Account sync — cancelled (modules removed)

Cloud Account sync is **not shipping**. Keep only:

- `enabled.ts` — hard cancel gate + health echo (`accountSyncEnabled` always false)
- `gone.ts` — shared **410** for `/api/auth/*` and `/api/sync/lists`

Deleted: file/Turso store, magic-link auth, mail, crypto, lists-sync, HTTP helpers, and their unit tests.

Cross-device lists: offline `shield-lists-v1` JSON/QR or desktop `shield-backup.json` (USB / Drive / Syncthing). See [docs/OFFLINE_LIST_SYNC.md](../../docs/OFFLINE_LIST_SYNC.md) and [docs/ACCOUNT_SYNC_GATE.md](../../docs/ACCOUNT_SYNC_GATE.md).
