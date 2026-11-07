# @deprecated — Account sync modules

**Status:** product cancelled (`ACCOUNT_SYNC_PRODUCT_CANCELLED` in `enabled.ts`).

Do not add features here. Prefer deleting call sites over extending. Website routes under `app/api/auth/*` and `app/api/sync/lists` return **`410 account-sync-cancelled`** via `gone.ts`. Desktop `/api/account*` returns the same. Unit tests may still import store/auth helpers locally.

Offline path: [docs/OFFLINE_LIST_SYNC.md](../../docs/OFFLINE_LIST_SYNC.md).
