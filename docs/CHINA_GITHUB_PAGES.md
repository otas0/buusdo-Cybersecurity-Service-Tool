# GitHub Pages — 中国大陆入口（告知书）

Workers（`*.workers.dev`）在部分大陆网络会 TCP 超时。**中国入口固定 URL**：

**https://otas0.github.io/buusdocst/**

| 角色 | 仓库 |
|------|------|
| 产品源码（唯一产品仓） | [`otas0/buusdo-Cybersecurity-Service-Tool`](https://github.com/otas0/buusdo-Cybersecurity-Service-Tool) — 目录 `china-pages/` 为源 |
| Pages 托管仓（仅静态发布） | [`otas0/buusdocst`](https://github.com/otas0/buusdocst) — 对外路径名，无产品逻辑 |

Actions **Pages China** 将 `china-pages/` 发布到 `otas0/buusdocst`（secret `BUUSDOCST_PAGES_DEPLOY_KEY`）。

## 设计语言

与 Workers 产品站同一套 instrument 体系：`shared/tokens.css`（部署前同步到 `china-pages/assets/tokens.css`），深色场、直角、Halt `#ff4d00`、透明底深色场 wordmark。

## 内容（仅告知书）

自 **2026-11-22** 起，中国入口**只保留**中英告知书与 Workers 产品站入口；说明 / 隐私摘要 / 安装指引已下线。

自 **2026-11-23** 起：Workers 对 `CF-IPCountry=CN` 的 HTML 导航**强制跳转**至本告知书（见下节）；本站**不再**自动 `location.replace` 回 Workers（避免循环）。

| 路径 | 用途 |
|------|------|
| `/` (`index.html`) | 中文告知书 + Workers 入口（手动） |
| `/en.html` | English notice + Workers entry (manual) |
| `/install.html` · `/privacy.html` | 薄跳转 → `index.html`（旧链兼容） |
| `/install-en.html` · `/privacy-en.html` | 薄跳转 → `en.html` |

顶栏：`中文 · EN`（`data-testid="china-lang-switch"`）。无站点「入口/安装/隐私」导航。

语言偏好：`lang-persist.js`（`<head>` 同步）→ `localStorage` `buusdocst-china-lang`。

## Workers → China Pages（强制）

逻辑：`shared/china-workers-redirect.ts` + 部署后入口包装。

**为何必须读 `request.cf.country`：** 在 `*.workers.dev` 上，`CF-IPCountry` **请求头**常不存在（除非在 Dashboard 打开 Managed Transform「Add visitor location headers」）。Cloudflare 官方国家码在 Workers 上可靠来源是 [`request.cf.country`](https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties)。仅读 `headers().get('cf-ipcountry')` 会导致大陆访客不跳转。

- **生产入口（必须）：** `npm run deploy:cloudflare` 在 `vinext build` 后运行 `scripts/wrap-worker-china-cf-redirect.mjs`，生成 `dist/server/china-cf-entry.js` 并设为 wrangler `main`。该包装在调用 vinext 前：
  1. 读 `request.cf.country`（缺省再读 header）
  2. `CN` 且非 `/api/*` → **302** → `https://otas0.github.io/buusdocst/`（`/en…` → `en.html`）
  3. 若 header 缺失则注入 `cf-ipcountry`，供 App Router / middleware 二次把关
- **App Router 备份：** `components/ChinaMainlandForceRedirect.tsx`（依赖注入后的 header）
- **middleware 备份：** 根目录 `middleware.ts`（`countryFromWorkersRequest`）

运维：

1. 自测留在 Workers：`?china_workers_stay=1`（cookie 8h）；清除：`?china_workers_stay=0`
2. `/api/health`、`/api/check`、`/api/geo` **永不** 跳转（扩展与机器调用不受影响）
3. 调试：`GET /api/geo` → `{ country, cfCountry, headerCfIpCountry, forceRedirectCountries, rateNote }`；响应头应有 `x-buusdocst-china-wrap: 1`
4. **先 staging 再 prod：** `npm run deploy:cloudflare:staging` → health → 再 `npm run deploy:cloudflare`
5. Deploy 含 wrap + `--check`（`main=china-cf-entry.js`）

### 产品决策：仅 CN（不含 HK/MO）

强制引导 **仅 `CN`**。`HK` / `MO` **不**强制跳转。若要纳入，须同步改 wrap 的 `FORCE_COUNTRIES` 与 `shared/china-workers-redirect.ts` 的 `CHINA_FORCE_REDIRECT_COUNTRIES`。

### Dashboard 双保险（可选）

Rules → Managed Transforms → **Add visitor location headers**，使 `CF-IPCountry` 与 `request.cf.country` 对齐（wrap 仍以 `cf.country` 为准）。

### Logpush（有自定义域后）

按 `EdgeResponseStatus=302` + `ClientCountry=CN` 与 Location→`otas0.github.io` 对齐统计（可与 stub path dump 同一工具链扩展）。

### TCP 超时 ≠ 跳转失败

大陆若 **连不上** `*.workers.dev`，请求到不了 Worker，**不会 302**。请直接打开本告知书。见 [LOCAL_CF_CONNECTIVITY.md](LOCAL_CF_CONNECTIVITY.md)。

## Region soft probe（本站）

`china-pages/region-redirect.js`（defer 关闭；`<head>` 同步）：

1. **不再强制跳转**：`GET /api/health` 成功且 `service === buusdocst` → 显示可达 +「打开 Workers」链接（手动）。
2. 本标签暂停探测：`?china_stay=1` → 仅 `sessionStorage`（`data-testid="china-stay-link"`）。清除：`?china_stay=0`。
3. Locale：手动打开 Workers 时按浏览器语言拼 `/zh-Hans` / `/zh-Hant` / `/en`。
4. Health 失败 → 留在告知书；`#workers-reach` 显示不可达。

UI：`data-testid="china-notice"` / `china-notice-title` / `china-workers-entry` / `china-region-redirect-hint` / `china-stay-link` / `china-stay-clear` / `china-workers-anyway`。

### Legacy install / privacy paths — keep thin redirects

**Decision (2026-11-22):** keep `/install.html` · `/privacy.html` · EN twins as **thin redirects** to the notice. Old bookmarks and store listing drafts still point there; deleting them would 404 without gain.

**Traffic gate before delete:** GitHub Pages / repo Insights do not expose path hits for `otas0/buusdocst`. Until a path log exists (Cloudflare Logpush on a custom domain, or Pages analytics if enabled), **do not remove** the stubs — **re-evaluate delete only after path-level logs exist** and show near-zero hits for `/install.html` · `/privacy.html` (and EN twins) for ≥30 days. Optional check: search referrers in Issues / store listing drafts for those paths.

**When Logpush exists:** export 30 days of path counts for `/install.html`, `/install-en.html`, `/privacy.html`, `/privacy-en.html` on the China entry host; if each is near zero, delete the thin stubs in a dedicated PR and keep only `index.html` / `en.html` notice routes.

```bash
# Scaffold — feed a JSONL / CSV / plain dump; prints GATE=keep|review
node scripts/parse-china-stub-path-counts.mjs --dump /path/to/logpush.jsonl --days 30
# Sample fixtures: tests/fixtures/china-stub-path-counts/
# Cloudflare Logpush-shaped sample: cloudflare-logpush.jsonl (ClientRequestURI / ClientRequestPath)
```

### Probe fail copy

- Network timeout / unreachable → `#workers-reach` fail (short).
- OPTIONS / CORS / `Failed to fetch` → preflight fail copy (points users to retry or open Workers directly).

## 与 Workers 的关系

| 表面 | 宿主 |
|------|------|
| 完整检查 / API / 隐私 / 安装 | Cloudflare Workers `buusdocst.mtsu.workers.dev` |
| 中国大陆告知书（静态；CN 强制落地） | GitHub Pages `otas0.github.io/buusdocst` |

Pages **不能**替代 `POST /api/check`。正式隐私以 Workers `/zh-Hans/privacy` · `/en/privacy` 为准（大陆访客打开时可能再次被引导回本告知书）。

- **Do not** revive `china-pages/site-config.js` or A4 / `/promo/poster.html` CTAs.
- Poster print handoff stays on Workers `/promo/` only.

## 运维

- 改 `china-pages/` 后推产品仓 `main` → Actions 同步到 `buusdocst`
- 手动：Actions → **Pages China** → Run workflow
- Workers 改 `middleware.ts` 后：`npm run deploy:cloudflare`
