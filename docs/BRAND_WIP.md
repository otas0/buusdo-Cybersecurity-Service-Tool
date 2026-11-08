# Brand WIP isolation

Locale / i18n PRs must stay free of brand visual experiments.

## Policy

- Put brand-only edits (wordmark, promo CSS experiments, popup chrome, desktop About frame, promo posters) on a **`brand/*`** branch (e.g. `brand/wip`, `brand/wordmark`).
- Do **not** mix brand WIP into locale pack commits or i18n PRs.
- Language-panel CSS in `app/shield.css` that ships with i18n UX is allowed on locale PRs; pure brand experiments are not.
- If the working tree is dirty with brand files while shipping locales, **stash first**:

```bash
git stash push -u -m "brand-wip" -- app/shield.css extension/popup docs/promo public/promo desktop-app/public
# …ship locale PR on main…
git stash pop
# continue on brand/* if needed
```

Or keep a long-lived branch:

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
