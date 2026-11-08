# Survey Round 2 — plan

Follow-on to First Round (`Desktop/CP/survey/First Round/`, n≈53). Product changes from Round 1 already ship on Halt/Hold (danger level, ignore-risk, step-by-step, report CTA, honest limits).

## Primary KPI

Track **`clicked_bad = not_sure`** rate before vs after the Round 1 UX changes.

| Metric | Round 1 baseline | Round 2 target |
|--------|------------------|----------------|
| `clicked_bad=not_sure` share | 13 / 53 ≈ **25%** | **≤ 15%** (clearer leave / verify / report path) |
| `clicked_bad=yes` + `no` (decided) | 40 / 53 ≈ 75% | ≥ 85% |
| `tool_useful=extremely` | 38 / 53 ≈ 72% | Hold or improve |
| Free-text asks for step-by-step / report / why | Multiple EN + 1 pt-PT | Should drop once respondents see new Halt UI |

## Instrument

Reuse Round 1 fields. Keep **`clicked_bad`** with the same three options (`yes` / `no` / `not_sure`). Do not remove `not_sure` — it is the uncertainty signal we are measuring.

Optional one new item (optional, not required for the KPI) — full instrument:
[survey-round2-instrument.md](./survey-round2-instrument.md)

- Field: **`saw_step_by_step`** = `yes` / `no` / `not_shown`
- After Halt, did you see step-by-step next actions?

## Analysis checklist

1. Export CSV; tally `clicked_bad` by language and role (teacher / student / parent).
2. Compare `not_sure` share to the 25% Round 1 baseline:
   ```bash
   node scripts/survey-round2-compare.mjs path/to/round2.csv
   ```
   (Prints share, Δ vs 25%, PASS/FAIL vs ≤15% target; tallies `saw_step_by_step` when present.)
3. Re-read free-text `frustration` for leftover “why / report / wipe / crowd votes” themes.
4. If `not_sure` stays high among under-18 students, tighten idle + Halt copy for that audience.
5. When Round-2 CSV lands, paste the script output under **Round-2 results** below.

## Form (ready to run)

1. Open [survey/round2-form.html](./survey/round2-form.html) (or host that file) — includes **`saw_step_by_step`**.
2. Optional visual aid: [store-screenshots/FRAME-hold.png](./store-screenshots/FRAME-hold.png).
3. Collect row CSVs → merge → compare:
   ```bash
   npm run survey:round2-compare -- path/to/merged-round2.csv
   ```

## Round-2 results

_Pending CSV._ Run `survey-round2-compare.mjs` and replace this section with the printed tallies.

## Product gates already in repo

- Website: `components/RiskResult.tsx` (`result-danger-level`, `result-ignore-risk`, `result-next-steps`, `halt-timing-chip`)
- Extension Halt toast: `extension/content/content.js` next-steps
- Desktop Halt: `result-danger-level` / `result-ignore-risk` on dashboard
- Parents/teachers FAQ: `/en/privacy#privacy-faq-parents`
