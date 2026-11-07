# Shared assets (extension + desktop-app + website brand)

| File | Purpose |
|------|---------|
| `tokens.css` | CSS variables — instrument dark field + Halt |
| `detect.mjs` | Tracker hosts and phishing signals used by the desktop app and the website check |
| `log-client.mjs` | Optional support diagnostics (`{ source, threat_type }`) when privacyMode is share |
| `brand.json` | Formal product name + asset paths |
| `brand/` | Synced web brand files (transparent dark-field wordmark/logo) |
| `brand/source/` | **Source of truth** light-plate PNGs for `npm run sync:brand-web` |

## Brand rebuild

Do **not** hand-edit `public/brand/buusdo-wordmark.png` (or the copies under `china-pages/`, `extension/icons/`, `desktop-app/public/brand/`). Those files must stay transparent so page `--bg` shows through.

1. Put / replace light-plate masters only under `shared/brand/source/` (`buusdo-wordmark-light-plate.png`, `buusdo-logo-light-plate.png`).
2. Run `npm run sync:brand-web`.
3. Run `npm run assert:brand-web-alpha`.

Never commit UTF-8-corrupted “PNG” binaries (signature must start with `89 50 4E 47`). Prefer `*.png` written by `sharp` / the sync script.

The Chrome extension keeps a copy of strings/rules inside `extension/` (MV3 package boundary). The desktop app reads these files directly via Express static + `require`.
