# Brand source plates

| File | Role |
|------|------|
| `buusdo-wordmark-light-plate.png` | Light-plate master for `npm run sync:brand-web` |
| `buusdo-logo-light-plate.png` | Square logo light-plate master |
| `buusdo-wordmark-paths.svg` | **Optional designer path wordmark** — when present, sync may adopt it; until then web UI uses transparent PNG derived from the light plate |

Do not commit UTF-8-corrupted binaries. Rebuild with `npm run sync:brand-web` then `npm run assert:brand-web-alpha`.
