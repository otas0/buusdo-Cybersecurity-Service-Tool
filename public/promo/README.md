# Promo posters (A4)

- `poster.html` — dense **EN + pt-PT + 中文** from `i18n/messages` + `zh-Hans` pack
- `poster-pt.html` — meta-refresh redirect → `poster.html` (legacy pt-only URL; keep for old links)
- Copy keys: `check`, `lightIdle`, `nextStep*`, `leave`, `ignoreRiskBody`, `privacyNote`, `lightLimited`, status words
- QRs: live Worker + China Pages
- Rebuild: `npm run build:promo-posters` then `npm run assert:promo-i18n`
- Optional PDF: `npm run export:promo-poster-pdf`
  - `PLAYWRIGHT_BROWSERS_PATH`: if unset on macOS and `~/Library/Caches/ms-playwright` exists, the export script uses that; else Playwright default (`~/.cache/ms-playwright` on Linux). Launch tries bundled Chromium, then `channel=chrome`.
  - Explicit: `PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright" npm run export:promo-poster-pdf`
  - Missing browsers: `npx playwright install chromium`
- Local privacy routes: `PROMO_ORIGIN=http://127.0.0.1:3000 npm run assert:promo-privacy-routes` (CI quality starts vinext on :3000)
- Dock: QR pair in `min-content` column; side copy uses `minmax(0,1fr)` so URLs wrap (no QR-over-text)

## Offline soft-skip (`assert:promo-privacy-routes`)

When `PROMO_ORIGIN` is unreachable (Workers timeout, no local vinext, DNS fail), the script **soft-skips** that URL and continues — it does **not** hard-fail the whole assert on network errors. Hard-fail only when the origin responds with a non-2xx status. For ship gates that must not depend on the network, use the local fixture:

- `tests/fixtures/privacy-no-survey.html` + `tests/privacy-fixture-no-survey.test.ts` (zero `/survey/` links, no Workers).

## Print QA (fit one page)

1. Open `poster.html` (or `/promo/poster.html` on Workers).
2. Print → Paper **A4** · Scale **100%** · Margins **None** · **Background graphics** On.
3. Do not use “Fit to printable area” if margins are already None — sheet is exactly 210×297 mm.
4. **Physical QA:** one hard-copy A4 at 100% / no margins; confirm QR scan (Workers + China), charcoal u-card (`#545454`), and no clipped footer.

u-card: [BRAND_U_CARD.md](../BRAND_U_CARD.md) (`#545454` on light).
