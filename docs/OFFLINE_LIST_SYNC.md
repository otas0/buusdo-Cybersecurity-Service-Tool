# Offline list sync (formal path)

Cloud Account sync is **cancelled**. Cross-device personal block/trust lists use **local files** only.

## Formats

| Artifact | Where | Schema |
|----------|--------|--------|
| Export JSON | Extension popup + desktop Lists | `shield-lists-v1` |
| QR compact | Extension + desktop | Same payload, QR-encoded |
| `shield-backup.json` | Desktop data dir | On-disk lists file (same domains) |

## Recommended flows

1. **USB / Drive** — Export JSON on device A → copy → Import on device B (extension or desktop).
2. **QR** — Export QR on one device → scan / paste compact payload on another (same user, same privacy mode).
3. **Syncthing (desktop)** — Point a Syncthing folder at the desktop data directory that contains `shield-backup.json` (see [DESKTOP_DATA_DIR_MIGRATE.md](DESKTOP_DATA_DIR_MIGRATE.md)). Keep one writer at a time; merge conflicts need a manual re-export.

## Website

The website does **not** store lists. Short guide: `/en/lists-offline`. Settings → Block/trust also links there (`data-testid=settings-lists-offline-path`).

## Do not

- Expect magic-link / cloud push-pull
- Commit list backups to git
- Sync Never-store sessions (lists are cleared when privacy is off)
