# Evaluation diff fixtures

Pair for smoke-testing the required CI job `evaluation-diff` (Markdown PR comment + exit 1 on newly failed scenarios):

```bash
npm run evaluate:diff:smoke
```

Expects exit code **1** and writes `evaluation/diff.md` with `EVAL-SMOKE-001` under Newly failed (includes the scenario name).

Nameless catalog lookup (names filled from `evaluation/scenarios.ts`):

```bash
npx tsx scripts/diff-evaluation-results.ts \
  evaluation/fixtures/diff-nameless-baseline.json \
  evaluation/fixtures/diff-nameless-current.json
```

Expects exit 1; Markdown should show `EVAL-002` with the catalog name “Normal HTTP unfamiliar domain”.

Personal trust overriding a curated phishing brand host is covered on the desktop classify path in `tests/desktop-lists-classify.test.ts` (not website evaluation scenarios — the site does not store personal lists).

`user-block` evidence appears only when a read-only `personalListBlocked` hint is injected (`tests/analyse-personal-list-hint.test.ts`). Controlled EVAL scenarios must never inject `personalListBlocked` or emit `user-block` (claim discipline in `evaluation-runner.ts`; static grep in `tests/evaluation-no-personal-hint.test.ts`).

**LIVE_PROBE ambiguous trio (diff reviewers):** `EVAL-034` = HTTP 403, `EVAL-035` = 429, `EVAL-036` = 503 — all expect `LOW_EVIDENCE` + `probe-blocked` (no escalate). Contrast `EVAL-033` (404 → `CAUTION`). See Operators FAQ — [probe-blocked vs phishing](../../docs/API_CHECK_CONTRACT.md#operators-faq--probe-blocked-vs-phishing).

**Optional PT bank lookalikes:** `EVAL-037`–`048` (2026-10-25) plus `EVAL-049`–`056` (banks-next) and `EVAL-057`–`064` (insurance/IRS) — each MERGE_PT on → `known-threat` / off → `no-match`.

**EVAL-057–064 (insurance/IRS, diff reviewers):** `fidelidade-apolice` / `ageas-sinistro` / `impostos-irs-login` / `seguro-directo-acesso` — same on/off map style as **EVAL-045–048** (`cgd-caixadirecta` / `ctt-tracking-pt`).

> Footnote: **EVAL-057+** hosts land in the suite only after the insurance/IRS batch is applied (`security/data/batches/pending-pt-insurance-irs.json` → `npm run threat:apply -- … --target=pt`). Do not add EVAL rows for hosts that still sit in an unapplied pending draft.

| Id | Host | MERGE_PT | Expect |
|----|------|----------|--------|
| **EVAL-037** | `mbway-login.example` | on | `known-threat` |
| **EVAL-038** | `mbway-login.example` | off | `no-match` |
| **EVAL-039** | `millenniumbcp-secure.example` | on | `known-threat` |
| **EVAL-040** | `millenniumbcp-secure.example` | off | `no-match` |
| **EVAL-041** | `novobanco-acesso.example` | on | `known-threat` |
| **EVAL-042** | `novobanco-acesso.example` | off | `no-match` |
| **EVAL-043** | `santander-pt-login.example` | on | `known-threat` |
| **EVAL-044** | `santander-pt-login.example` | off | `no-match` |
| **EVAL-045** | `cgd-caixadirecta.example` | on | `known-threat` |
| **EVAL-046** | `cgd-caixadirecta.example` | off | `no-match` |
| **EVAL-047** | `ctt-tracking-pt.example` | on | `known-threat` |
| **EVAL-048** | `ctt-tracking-pt.example` | off | `no-match` |
| **EVAL-049** | `activobank-secure.example` | on | `known-threat` |
| **EVAL-050** | `activobank-secure.example` | off | `no-match` |
| **EVAL-051** | `bancobpi-login.example` | on | `known-threat` |
| **EVAL-052** | `bancobpi-login.example` | off | `no-match` |
| **EVAL-053** | `montepio-acesso.example` | on | `known-threat` |
| **EVAL-054** | `montepio-acesso.example` | off | `no-match` |
| **EVAL-055** | `bancoctt-login.example` | on | `known-threat` |
| **EVAL-056** | `bancoctt-login.example` | off | `no-match` |
| **EVAL-057** | `fidelidade-apolice.example` | on | `known-threat` |
| **EVAL-058** | `fidelidade-apolice.example` | off | `no-match` |
| **EVAL-059** | `ageas-sinistro.example` | on | `known-threat` |
| **EVAL-060** | `ageas-sinistro.example` | off | `no-match` |
| **EVAL-061** | `impostos-irs-login.example` | on | `known-threat` |
| **EVAL-062** | `impostos-irs-login.example` | off | `no-match` |
| **EVAL-063** | `seguro-directo-acesso.example` | on | `known-threat` |
| **EVAL-064** | `seguro-directo-acesso.example` | off | `no-match` |