# China privacy summary ↔ Workers `/zh-Hans/privacy`

Checklist to keep Pages `china-pages/privacy.html` aligned with the live Workers privacy page.

| Topic | Workers `/zh-Hans/privacy` | China `privacy.html` | Status |
|-------|---------------------------|----------------------|--------|
| Product formal name | `buusdo Cybersecurity Service Tool` | same in title / body | ✓ reviewed 2026-11-08 (pack + Pages) |
| What a check uses | server parse + own list + optional DNS/HTTP; no third-party reputation | same summary | ✓ aligned |
| What is stored | default nothing; optional on-device lists/history | same; no cloud account sync | ✓ aligned |
| Honest limits | no TLS decrypt / no process kill / system dirs report-only / no AV | Halt FAQ + “不是杀毒软件” | ✓ aligned — FAQ Pages-only short form |
| Contact | operator of the Worker deployment | “联系运行该部署的运营方” | ✓ aligned |
| Full policy CTA | self | link → `https://buusdocst.mtsu.workers.dev/zh-Hans/privacy` | ✓ linked |
| Language pref note | n/a (Workers locale select) | `#china-lang-pref` foot-note | ✓ Pages-only |
| Live soft check | `privacy-prod` `/zh-Hans/privacy` soft | — | ✓ CI after Deploy |
| Locale recommend / FAQ chrome | Workers packs zh-Hans | Pages Halt FAQ short form | ✓ re-ticked 2026-11-08 (fr Privacy bodies grown; zh-Hans pack stable) |

**When editing either surface:** update this table’s Status column and re-check zh / EN pair (`privacy-en.html` ↔ `/en/privacy`).

**CI hooks:** `tests/china-halt-next-steps.test.ts` (Halt FAQ), `scripts/assert-formal-name.mjs` (brand alt), China install/Workers locale table in `docs/CHINA_GITHUB_PAGES.md` + `tests/china-setup-guide-parity.test.ts`.
