# Workers error-rate baseline (screenshot archive)

After go-live, capture a **baseline** so the first 48h alerts have a reference.

## Capture

1. Cloudflare dashboard → Workers → **`buusdocst`** → **Metrics**.
2. Set range to last 24h (or since first deploy).
3. Screenshot: errors and CPU (full chart area). Optional third shot for requests.
4. Save under `ops/workers-baselines/` using **UTC date** and this **exact** naming:

```
YYYY-MM-DD-buusdocst-errors.png
YYYY-MM-DD-buusdocst-cpu.png
YYYY-MM-DD-buusdocst-requests.png   # optional
YYYY-MM-DD-buusdocst-NOTES.txt      # Version ID + UTC time + dashboard range
```

Example:

```
ops/workers-baselines/2026-11-01-buusdocst-errors.png
ops/workers-baselines/2026-11-01-buusdocst-cpu.png
ops/workers-baselines/2026-11-01-buusdocst-NOTES.txt
# Historical `*-pcpd-*` filenames are deprecated — see ops/workers-baselines/README.md
```

`NOTES.txt` one-liner:

```
UTC=2026-11-01T12:00:00Z version=01af6f51-… worker=pcpd range=24h
```

## Do not commit PNGs to git

`ops/workers-baselines/.gitignore` ignores binaries. Keep screenshots local or on a private drive.

## When to re-baseline

- After a custom-domain second deploy
- After probe-timeout or rate-limit changes
- After any incident that changed traffic shape

Use a **new** `YYYY-MM-DD-…` prefix; do not overwrite older days.