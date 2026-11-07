# First-party threat data

busdo does **not** call Google Safe Browsing or other third-party reputation APIs. Product reputation comes from files in this folder plus address signals in code.

`runtime/` is gitignored (except `.gitkeep`) — head-skip cache and optional `env-overrides.env` when vinext denies `.env.local` writes.

| File | Role |
|------|------|
| `curated-threats.json` | Core first-party host list (KNOWN_PHISHING / KNOWN_MALICIOUS) |
| `curated-threats.pt.json` | Portugal-oriented `.example` seeds — merged by default (`OWN_THREAT_MERGE_PT=0` to disable) |
| `test-threats.json` | `.test` fixtures for automated tests only — not a public product pitch |
| `batches/` | Operator report / false-positive batches waiting to apply |
| `batches/applied/` | Archived batches after a successful apply |

## Operating the list

### From the product (preferred)

1. On a check result, use **Wrong result?** → draft **report** (missed threat) or **false positive** (wrong flag).  
   Stores only domain + risk level + mark on this device (requires Data = This device only / Diagnostics).
2. Open **Settings → Feedback drafts** — confirm the **host count** (add / remove), then **Export batches/*.json draft**.
3. Move the file into `security/data/batches/`. Fill `reviewedBy`, set `reviewChecklist` (`hostsReviewed`, `falsePositivesConfirmed`, `readyToApply`) to `true`, then apply (below).  
   `threat:apply` rejects exports that still have `readyToApply: false` or an empty `reviewedBy`.

### From a hand-written batch

1. **Report (add):** copy `batches/_template.json`, set `"kind": "report"`, list hosts under `add`.
2. **False positive (remove):** set `"kind": "false-positive"`, list hosts under `remove`.
3. **Mixed review:** `"kind": "mixed"` with both `add` and `remove`.
4. Apply and verify:

```bash
npm run threat:apply -- security/data/batches/your-batch.json
```

### Required check after every list change

**After any change to `curated-threats.json` (batch apply or hand edit), you must run:**

```bash
npm run regression
```

`threat:apply` runs regression automatically. Hand edits should use:

```bash
npm run threat:check
```

(`threat:check` = validate curated JSON + regression.)

Do not commit or ship a list change if regression fails. Fix or revert the batch first.

## Optional operator overlay

Set `OWN_THREAT_LIST_PATH` to an extra first-party JSON file on disk (same `{ "hosts": { ... } }` shape). Still never send checked URLs to third parties.

## Probe timeout tuning

`CHECK_PROBE_TIMEOUT_MS` (default 5000) is exposed on `GET /api/health` as `probeTimeoutMs`.  
Settings compares that budget with local timeout history and suggests `ceil(maxTimedOutProbeMs × 1.2)` (rounded up to 100ms).  
Writing via Settings → `.env.local` also hot-applies an in-process override (no server restart).

## Runtime head-skip cache

Hosts that repeatedly reject HEAD are stored under `security/data/runtime/head-skip.json` (gitignored) so skips survive restarts. `/api/health` lists active `headSkipDomains`.