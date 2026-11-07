# Workers metrics baselines

Store error/CPU screenshots here locally (gitignored PNGs). Procedure: [docs/WORKERS_ERROR_BASELINE.md](../../docs/WORKERS_ERROR_BASELINE.md).

## Naming

Use **`buusdocst`** in new filenames:

```text
YYYY-MM-DD-buusdocst-errors.png
YYYY-MM-DD-buusdocst-cpu.png
YYYY-MM-DD-buusdocst-NOTES.txt
```

## Deprecated

Historical files named `*-pcpd-*` (e.g. `2026-11-01-pcpd-NOTES.txt`) are **archived labels only**. Workers `pcpd` and `preventive-shield` were deleted. Do not create new baselines or Cloudflare notification policies under those names — Metrics must target **`buusdocst`**.
