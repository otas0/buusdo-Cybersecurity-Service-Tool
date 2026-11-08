# Brand WIP isolation

Product chrome i18n PRs must stay locale-clean. Brand / promo / wordmark experiments often dirty:

- `app/shield.css`
- `extension/popup/*`
- `desktop-app/public/js/dashboard.js`
- `docs/promo/*`, `public/promo/*`
- `scripts/assert-formal-name.mjs`, poster PDF floors

## Policy

1. Do **not** mix brand WIP into locale pack commits on `main`.
2. Park brand work on `brand/<topic>` (example: `brand/wordmark-paths`).
3. Before starting an i18n batch:

```bash
git status -sb
# If brand files are dirty and unrelated:
git stash push -u -m "brand-wip" -- app/shield.css extension/popup docs/promo public/promo desktop-app/public/js/dashboard.js
# or discard if disposable:
git checkout -- app/shield.css extension/popup/popup.html desktop-app/public/js/dashboard.js
```

4. After the locale PR lands, restore with `git stash pop` on the brand branch only.
5. Never `git stash` brand WIP onto a locale working tree and leave it — it re-pollutes the next pack PR.
