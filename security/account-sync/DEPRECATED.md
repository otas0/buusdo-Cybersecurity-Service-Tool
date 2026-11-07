# @deprecated — Account sync modules

**Status:** product cancelled (`ACCOUNT_SYNC_PRODUCT_CANCELLED` in `enabled.ts`).

Do not add features here. Prefer deleting call sites over extending. Website routes under `app/api/auth/*` and `app/api/sync/lists` stay wired only so they return `503 account-sync-disabled`. Desktop `/api/account*` returns `410 account-sync-cancelled`.

Offline path: [docs/OFFLINE_LIST_SYNC.md](../../docs/OFFLINE_LIST_SYNC.md).
