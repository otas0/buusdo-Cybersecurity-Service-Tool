# Store screenshots

Every Chrome / Safari store screenshot must include the formal product name **buusdo Cybersecurity Service Tool** in-frame (wordmark or title chrome).

- Background: instrument dark field `#0e0e0e` with transparent wordmark — never a white plate bar.
- Extension toolbar icons: `extension/icons/icon{16,48,128}.png` (dark field + Halt mark).
- `FRAME-formal-name.png` — Halt readout from `npm run capture:store-halt-frame` (Sharp).
- `FRAME-clear.png` / `FRAME-hold.png` — Clear / Hold companion frames (same capture script; store shot 2 pair).
- CI quality runs `capture:store-halt-frame` and fails if committed FRAMEs drift. Chromium CI jobs also run `capture:store-halt-frame:playwright` (writes `FRAME-formal-name.playwright.png` only — never overwrites Sharp FRAME).
- Prefer live product screenshots for final store submit; these frames are the committed instrument references.
- `npm run sync:brand-web` rebuilds OG / icons but **does not** overwrite FRAME PNGs.
- Captions: see [CHROME_STORE_LISTING_DRAFT.md](../CHROME_STORE_LISTING_DRAFT.md).
