# Threat list batches

Pending operator batches live here. After `npm run threat:apply`, the JSON file is moved to `applied/`.

Copy `_template.json` (core) or `_template.pt.json` (Portugal seeds), fill `add` / `remove`, then. **Same-PR rule:** EVAL MERGE on/off rows for new hosts must land with `threat:apply` (scenarios + fixtures README + CI `min` bump) — see template `notes`.

```bash
npm run threat:apply -- security/data/batches/your-batch.json
# PT: npm run threat:apply -- security/data/batches/your-pt-batch.json --target=pt
# Preview: add --dry-run (skips readyToApply checklist; still fails on validation errors)
```

That command **writes `curated-threats.json` and runs `npm run regression`**. Do not commit a list change without a green regression.

### Portugal seeds (`curated-threats.pt.json`)

```bash
npm run threat:apply -- security/data/batches/your-pt-batch.json --target=pt
```

Also accepted: batch JSON `"target": "curated-threats.pt.json"`. Runs `threat:check` after apply. Preview without write: `--dry-run`. Then exercise Settings MERGE_PT write on a local draft PR.

### MERGE_PT evaluation trio

After PT list changes, `npm run evaluate` must keep this trio green. Same gate as `npm run threat:check:help` (EVAL-029–032 notice).

| Id | Intent |
|----|--------|
| **[EVAL-029](../../../evaluation/scenarios.ts)** | merge on → `autenticacao-gov.example` hits `known-threat` |
| **[EVAL-030](../../../evaluation/scenarios.ts)** | merge off → same host is `no-match` |
| **[EVAL-031](../../../evaluation/scenarios.ts)** / **[EVAL-032](../../../evaluation/scenarios.ts)** | benign lookalike `autenticacao-ajuda.example` stays low (merge on/off) |

Optional bank / insurance lookalikes: **EVAL-037–064** in [`evaluation/scenarios.ts`](../../../evaluation/scenarios.ts) — each MERGE_PT on/off. Insurance/IRS batch: `pending-pt-insurance-irs.json` (moves to `applied/` on `threat:apply --target=pt`) → **EVAL-057–064**.

```bash
npm run threat:check:help   # prints EVAL-029–032 gate notice
npm run evaluate
```