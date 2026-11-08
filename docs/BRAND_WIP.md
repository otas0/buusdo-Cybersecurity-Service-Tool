# Brand WIP isolation

Locale / i18n PRs must stay free of brand visual experiments.

## Policy

- Put brand-only edits (wordmark, `app/shield.css` promo experiments, popup chrome, desktop About frame, promo posters) on a `brand/*` branch.
- Do **not** mix brand WIP into locale pack commits or i18n PRs.
- If the working tree is dirty with brand files while shipping locales:

```bash
git stash push -u -m "brand-wip" -- app/shield.css extension/popup docs/promo public/promo desktop-app/public
# …ship locale PR…
git stash pop
```

Or keep a long-lived local branch:

```bash
git switch -c brand/wip
# brand experiments only
git switch main
```

## Do not commit from locale work

- `app/shield.css` visual experiments unrelated to the language panel
- `extension/popup/*` brand-only
- `docs/promo/*`, `public/promo/*`
- Desktop About / wordmark capture scripts unless the PR is brand-scoped
