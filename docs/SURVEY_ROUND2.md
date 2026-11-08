# Survey Round 2 — plan

Follow-on to First Round (`Desktop/CP/survey/First Round/`, n≈53). Product changes from Round 1 already ship on Halt/Hold (danger level, ignore-risk, step-by-step, report CTA, honest limits).

## Status: OPEN for responses

| Surface | URL |
|---------|-----|
| Workers (prod) | `https://buusdocst.mtsu.workers.dev/survey/round2.html` |
| China Pages | `https://otas0.github.io/buusdocst/survey-round2.html` |
| Source / offline | [survey/round2-form.html](./survey/round2-form.html) |
| Privacy deep-link | `/en/privacy` → Round-2 link under parents FAQ |

Each submit downloads one CSV row (nothing uploaded). Merge rows, then:

```bash
npm run survey:round2-compare -- path/to/merged-round2.csv --write-md=docs/SURVEY_ROUND2.md
```

## Primary KPI

Track **`clicked_bad = not_sure`** rate before vs after the Round 1 UX changes.

| Metric | Round 1 baseline | Round 2 target |
|--------|------------------|----------------|
| `clicked_bad=not_sure` share | 13 / 53 ≈ **25%** (combined CSVs) | **≤ 15%** |
| `clicked_bad=yes` + `no` (decided) | ≈ 75% | ≥ 85% |
| `tool_useful=extremely` | ≈ 72% | Hold or improve |

### Round-1 segmented baseline (main offline CSV, n=51)

```
file: survey-responses-2026-11-01-06-45-29.csv
n=51 clicked_bad: yes=14 no=25 not_sure=11 other=1
not_sure share: 21.6% (Round-1 baseline 24.5%, Δ -3.0 pp)
segment age=under18: not_sure 6/19 (31.6%)
segment age≠under18: not_sure 5/31 (16.1%)
segment role=teacher: not_sure 4/25 (16.0%)
segment role≠teacher: not_sure 7/25 (28.0%)
```

Under-18 `not_sure` is higher than teachers — Round-2 should watch that segment.

## Instrument

Reuse Round 1 fields. Keep **`clicked_bad`** with `yes` / `no` / `not_sure`.

Optional: **`saw_step_by_step`** = `yes` / `no` / `not_shown` — [survey-round2-instrument.md](./survey-round2-instrument.md).

Facilitator visual: [store-screenshots/FRAME-hold.png](./store-screenshots/FRAME-hold.png).

## Analysis checklist

1. Export / merge CSV rows from the open form.
2. Compare `not_sure` (overall + under18 + teacher + **locale/language**):
   ```bash
   npm run survey:round2-compare -- path/to/merged-round2.csv --write-md=docs/SURVEY_ROUND2.md
   ```
   The script prints `segment by locale/language:` when the CSV has `locale` or `language`.
3. Re-read free-text `frustration` for leftover themes.
4. If under-18 `not_sure` stays high, tighten idle + Halt copy for that audience.

## Facilitator notes — `language` / `locale`

| Field | Required | Values |
|-------|----------|--------|
| `language` | yes | UI locale used during the Halt session (`en`, `pt-PT`, `zh-Hans`, `ja`, `th`, `mi`, … or `other`) |
| `locale` | optional | Same BCP-47 id as the product header when available. Compare segments with **`locale` if non-empty, else `language`** (`segment by locale/language:`). |

Ask participants to pick the **same language they used in the product header** while answering. Prefer filling **`locale`** with that BCP-47 id (e.g. `zh-Hans`) so Round-2 `not_sure` splits stay stable when `language` is a free-text label. Merge row CSVs without renaming columns.

## Form (ready to run)

1. Open the live URLs above (or [survey/round2-form.html](./survey/round2-form.html)).
2. Optional visual aid: [store-screenshots/FRAME-hold.png](./store-screenshots/FRAME-hold.png).
3. Collect row CSVs → merge → compare with `--write-md`.

## Round-2 results

_Pending merged Round-2 CSV._ Form is **OPEN**. When rows land, run `survey:round2-compare` with `--write-md=docs/SURVEY_ROUND2.md` to replace this section.

## Product gates already in repo

- Website: `components/RiskResult.tsx` (`result-danger-level`, `result-ignore-risk`, `result-next-steps`, `halt-timing-chip`)
- Extension Halt toast: shared `phishing-toast-mount.js`
- Desktop Halt: `result-danger-level` / `result-ignore-risk`
- Parents/teachers FAQ: `/en/privacy#privacy-faq-parents`
