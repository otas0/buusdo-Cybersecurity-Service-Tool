# Optional: migrate desktop data dir off legacy “Preventive Shield”

**Status:** optional — not required for website / extension ship.

User-facing brand is **buusdo Cybersecurity Service Tool**. On-disk data directories still use the legacy folder name so upgrades keep lists / quarantine:

| OS | Legacy path (current) |
|----|------------------------|
| macOS | `~/Library/Application Support/Preventive Shield/` |
| Windows | `%APPDATA%\Preventive Shield\` |

`desktop-app/src/user-data.js` → `PRODUCT = "Preventive Shield"` drives that path. **Changing it without a migrate step wipes user data.**

## Proposed migrate (when scheduled)

1. Pick new folder: `buusdo Cybersecurity Service Tool` (or `buusdocst`).
2. On first launch after bump: if legacy dir exists and new dir does not, **copy** (not move) `shield-backup.json` + quarantine trees.
3. Write a one-line `migrated-from-v1` marker in the new dir.
4. Keep reading legacy for one release if marker missing and new empty.
5. Document in [PACKAGING.md](../desktop-app/PACKAGING.md) + release notes.

Do **not** rename Xcode / NSIS install trees in the same change set as the data-dir migrate.
