# Buusdo line — wordmark u-card color

**Applies to:** buusdo product **line** wordmarks (including **buusdo Cybersecurity Service Tool** in this repo and **buusdo Graphics Enhancement Tool**). Same line, separate products — shared **u** parallelogram color only.

## Spec

| Plate | u parallelogram fill | Hex | Notes |
|-------|----------------------|-----|-------|
| Light / print / on-light PNG | Charcoal | `#545454` | Designer reference. **Never** Halt orange `#ff4d00`. |
| Dark field (site header, tray on black) | Instrument muted | `#8d897f` | Mapped from charcoal in `npm run sync:brand-web`. Do not cream-invert the u-card. |

Wrong:

- Halt orange on the u-card
- Washed light gray (alpha diluted on mid tones)
- Cream u that matches letter fills on dark field

## CST source of truth

| Path | Role |
|------|------|
| `shared/brand/source/designer/buusdo-cst-wordmark-reference.png` | Designer still (white plate, CST tagline) |
| `shared/brand/source/buusdo-wordmark-light-plate.png` | Cropped light-plate master for sync |
| `shared/brand/source/buusdo-wordmark-paths.svg` | Preferred source — embeds plate + locks `#545454` swatch/`u-card`; sync rasterizes this when present |
| `scripts/sync-brand-web-assets.mjs` | Builds on-light + dark-field + china / extension / desktop copies |
| `npm run assert:brand-web-alpha` | Asserts charcoal `#545454` @ alpha 255 on-light; muted on dark |

## Graphics Enhancement Tool

Keep the same u-card hex on Graphics promo / `logo-wordmark` light plates (`#545454`). Tagline text differs by product; u color does not.

Copy of this spec may live at `buusdo/docs/BRAND_U_CARD.md` in the Graphics repo — keep hex tables in sync when either product changes.

## Rebuild

```bash
npm run sync:brand-web
npm run assert:brand-web-alpha
npm run capture:store-halt-frame   # Chrome store FRAMEs use dark wordmark
npm run build:promo-posters
# Graphics sibling clone:
npm run assert:graphics-wordmark-charcoal
```

When `shared/brand/source/buusdo-wordmark-paths.svg` lands, prefer that vector and remove charcoal-detection heuristics from `scripts/sync-brand-web-assets.mjs`.
