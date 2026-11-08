# Survey Round 2 — instrument (optional question)

Canonical plan: [SURVEY_ROUND2.md](./SURVEY_ROUND2.md).

**Ship a form:** open [survey/round2-form.html](./survey/round2-form.html) in a browser (local CSV download, no upload). Facilitators can show Halt/Hold frames from [store-screenshots/](./store-screenshots/) (`FRAME-hold.png`).

## Required fields (same as Round 1)

Keep: `language`, `role`, `age`, `confidence`, `clicked_bad`, `tracking`, `tool_useful`, `ui_easy`, `consent_anonymous`, `frustration`.

**`clicked_bad`** options must stay: `yes` | `no` | `not_sure`.

## Optional new field

| Field | Values | When shown |
|-------|--------|------------|
| `saw_step_by_step` | `yes` / `no` / `not_shown` | After the Halt / Hold experience (or after viewing a Halt screenshot in the survey flow) |

Question copy (EN):

> After the red Halt (or Hold) result, did you see step-by-step next actions (leave, do not enter credentials, verify on an official channel)?

- **yes** — saw the numbered steps  
- **no** — saw Halt but not the steps  
- **not_shown** — did not reach a Halt/Hold result  

pt-PT:

> Depois do resultado Parar (ou Reter), viu ações passo a passo (sair, não introduzir credenciais, verificar num canal oficial)?

## Analysis

```bash
node scripts/survey-round2-compare.mjs path/to/round2.csv
```

Compares `clicked_bad=not_sure` to Round-1 baseline **25%** (13/53) and Round-2 target **≤15%**. If `saw_step_by_step` is present, tallies that column too.
