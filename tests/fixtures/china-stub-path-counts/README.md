# China stub path-count fixtures

Sample dumps for `scripts/parse-china-stub-path-counts.mjs`.

```bash
node scripts/parse-china-stub-path-counts.mjs --dump tests/fixtures/china-stub-path-counts/near-zero.jsonl
# → GATE=review

node scripts/parse-china-stub-path-counts.mjs --dump tests/fixtures/china-stub-path-counts/hot-stubs.csv
# → GATE=keep

node scripts/parse-china-stub-path-counts.mjs --dump tests/fixtures/china-stub-path-counts/cloudflare-logpush.jsonl
# → Cloudflare Logpush-shaped rows (ClientRequestURI / ClientRequestPath)
```
