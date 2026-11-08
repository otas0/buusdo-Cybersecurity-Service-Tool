# Promo posters (A4)

- `poster.html` — **EN + pt-PT + 中文** (one sheet)
- `poster-pt.html` — redirect to `poster.html`
- QRs: live Worker + China Pages mirror
- Wordmark / QR use `?v=` cache-bust (`.cachebust`)

## Print (fit one page)

1. Open `poster.html`
2. Print → Paper **A4** · Scale **100%** · Margins **None** · **Background graphics** On
3. Do not use “Fit to printable area” if margins are already None — sheet is exactly 210×297 mm

Rebuild: `npm run build:promo-posters`

u-card: [BRAND_U_CARD.md](../BRAND_U_CARD.md) (`#545454` on light).
