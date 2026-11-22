# China Pages vs Workers privacy

China Pages no longer ships a privacy summary. From **2026-11-22** the site is notice-only; privacy lives on Workers.

| Topic | Workers | China Pages | Status |
|-------|---------|-------------|--------|
| Formal privacy | `/zh-Hans/privacy` · `/en/privacy` | Link only from notice foot-note | ✓ |
| China entry suspension | `privacyPolicyChinaTitle` / `privacyPolicyChinaBody` on Workers privacy | Notice body | ✓ |
| Health probe disclosure | Workers privacy | Notice §3 / §3 EN | ✓ aligned with `region-redirect.js` |
| Language pref localStorage | N/A | `buusdocst-china-lang` on notice | ✓ |
| Stay-on-notice opt-out | N/A | `buusdocst-china-stay` | ✓ local only |
| Install / privacy HTML body | Workers downloads / privacy | Thin redirects → notice | ✓ |

**When editing:** update Workers privacy first; keep notice §3 in sync with `region-redirect.js`.
