# Brand source plates

| File | Role |
|------|------|
| `designer/buusdo-cst-wordmark-reference.png` | **Designer still** (do not guess colors — replace plates from this) |
| `buusdo-wordmark-light-plate.png` | Cropped light-plate master for `npm run sync:brand-web` |
| `buusdo-logo-light-plate.png` | Square logo light-plate master (same u-card) |
| `buusdo-wordmark-paths.svg` | **Preferred** — frozen charcoal `#545454` u-card polygon + letterforms; `sync:brand-web` rasterizes this when present |

## u-card color (required)

See [docs/BRAND_U_CARD.md](../../docs/BRAND_U_CARD.md) (shared with Graphics product line).

| Surface | u parallelograms | Notes |
|---------|------------------|-------|
| Light plate / on-light PNG | **`#545454`** charcoal | Designer reference — **never Halt orange `#ff4d00`** |
| Dark-field PNG | **`#8d897f`** instrument muted | Sync maps charcoal → muted; do not cream-invert |

Rebuild: `npm run sync:brand-web` then `npm run assert:brand-web-alpha`.
