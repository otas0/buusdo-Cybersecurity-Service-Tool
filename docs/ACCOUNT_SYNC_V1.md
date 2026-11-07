# Account sync V1 — **cancelled**

Cloud Account sync is **not shipping**. Personal block/trust lists stay on-device; offline export/import JSON or QR remains.

Canonical status: [ACCOUNT_SYNC_GATE.md](ACCOUNT_SYNC_GATE.md).

Legacy module tree under `security/account-sync/` and `/api/auth/*` / `/api/sync/lists` may still exist but `isAccountSyncEnabled()` is hard-false via `ACCOUNT_SYNC_PRODUCT_CANCELLED`. Routes return `503` `{ ok:false, error:"account-sync-disabled" }`.
