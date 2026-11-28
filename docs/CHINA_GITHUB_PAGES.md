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
5. Deploy 含 wrap + `--check`（`main=china-cf-entry.js`，`assets.run_worker_first=["/*","!/_next/static/*","!/*/_next/static/*"]` — **不要**用 boolean `true`，否则 CSS/JS 404）
6. 线上若仍见产品页：看响应头 `x-buusdocst-china-wrap` / `x-buusdocst-cf-country`。`run_worker_first` 未开时 Assets 可能绕过 wrap（历史故障）。裸页 / 蓝 Run / 双 logo → 先查 `/_next/static/css/*.css` 是否 200（`npm run assert:prod-css-asset`）。
7. TCP 超时到不了 Worker → **不会 302**；请直接打开本告知书。客户端兜底（zh-CN + Asia/Shanghai）仅在 Workers HTML 已加载时 `location.replace` 到本站。

### 产品决策：仅 CN（不含 HK/MO）

强制引导 **仅 `CN`**。`HK` / `MO` **不**强制跳转。若要纳入，须同步改 wrap 的 `FORCE_COUNTRIES` 与 `shared/china-workers-redirect.ts` 的 `CHINA_FORCE_REDIRECT_COUNTRIES`。

### Dashboard 双保险（可选）

Rules → Managed Transforms → **Add visitor location headers**，使 `CF-IPCountry` 与 `request.cf.country` 对齐（wrap 仍以 `cf.country` 为准）。

### Logpush（有自定义域后）

对齐过滤（与 stub path dump 同一工具链扩展）——**仅描述「能连上 Workers 时」的 CN 302**：

- `EdgeResponseStatus=302`（或 `301`）
- `ClientCountry=CN`
- `EdgeResponseHeaders` / Location 含 `otas0.github.io`

**不要**把该计数当作「大陆用户触达率」：连不上 Workers 的访客根本不会进 Logpush。大陆触达请用告知书渠道（Pages 打开、QR、商店/社媒）另行估算。

**仪表盘注释（必加）：** 在任何 Cloudflare / Logpush 图表标题或说明中写明 **「非触达率 / not mainland reach rate」** — 仅表示「已连上 Workers 且 CF=CN 时的 302 样本」。

ubuntu CI **不能**伪造 `request.cf.country`；软探测见 `scripts/soft-china-redirect-probe.mjs`（断言 wrap 头 + 记录非 CN 样本）。真实 CN 302 样本出现后贴进 [CI.md](CI.md) scrapbook。

### 自定义域上线后复测

按 [CUSTOM_DOMAIN_REDEPLOY.md](CUSTOM_DOMAIN_REDEPLOY.md) 切域后：

1. `wrangler versions view <id> --json` → `raw_run_worker_first` 仍为 vinext 排除列表（**不是** boolean `false` 且无整表 Assets-first）
2. `GET /api/health` → `x-buusdocst-china-wrap: 1`
3. 大陆可达网络：HTML 对 CN 仍 302 → 本告知书

### 非 workers.dev 入口（评估）

`*.workers.dev` 在部分大陆网络 TCP 超时。自定义域（橙云 CNAME 到同一 Worker）**可能**改善连通，但不能保证；告知书入口始终保留。评估顺序：DNS 自定义域 → 大陆抽测 `/api/health` → 再决定是否把推广链切到自定义域（[PUBLIC_PROMOTION.md](PUBLIC_PROMOTION.md)）。

### TCP 超时 ≠ 跳转失败

大陆若 **连不上** `*.workers.dev`，请求到不了 Worker，**不会 302**，`/api/geo` 也打不开。请直接打开本告知书。见 [LOCAL_CF_CONNECTIVITY.md](LOCAL_CF_CONNECTIVITY.md)。

服务端仅在 `request.cf.country=CN` 时 302（伪造 `CF-IPCountry` 无效）。浏览器为 zh-CN / zh-Hans 时，客户端脚本会 `location.replace` 到本站作为兜底——**同样要求 Workers HTML 已加载**。

### 如何让大陆用户「知道服务未开放」（不依赖 Workers）

Workers 不可达时，产品站无法展示任何文案。只能走 **Workers 之外** 的渠道：

1. **本告知书 URL** `https://otas0.github.io/buusdocst/`（标题即为「中国大陆地区检查服务未开放」）
2. **海报 / 中国 QR**（`public/promo/china-qr.svg` → 本告知书）
3. **扩展不可达文案**（指向告知书，写明勿等跳转）
4. **商店 / 社媒 / 线下** 粘贴 [PUBLIC_PROMOTION.md](PUBLIC_PROMOTION.md)「面向大陆用户」块

### 评估：Gitee / 国内 CDN 镜像（仅告知书）

| 选项 | 利 | 弊 | 建议 |
|------|----|----|------|
| 继续仅 GitHub Pages | 与现有 Actions `pages-china` 同源；零额外账号 | 部分大陆网络访问 `github.io` 也慢 | **默认保留** |
| Gitee Pages 镜像 | 国内解析可能更好 | 需人工/CI 双推；内容漂移风险；Gitee 审核与可用性不稳定 | 仅当抽测显示多数目标用户打不开 `otas0.github.io` 时再开 |
| 国内对象存储 + CDN（COS/OSS） | 可控、快 | 成本、备案/合规、密钥运维 | 有备案与预算后再评估 |

**约束（若上镜像）：**

1. **只托管告知书同源文案**（`china-pages/` 同步），**禁止**放完整检查 UI 或 `/api/check` 代理。
2. 镜像 URL 写入 `shared/china-pages.json` 的可选 `mirrorUrl`，推广大陆块可并列，仍以 GitHub Pages 为 canonical。
3. CI：镜像部署失败不得阻塞 Workers 发布；文档写明「双入口、同文案」。`mirrorUrl` 非空时跑 `node scripts/soft-china-mirror-probe.mjs`（与 canonical 告知书 title / service-closed 标记一致；空则跳过）。

**当前决策（2026-11-28）：** 暂不建 Gitee/CDN 镜像；先保证告知书文案清晰 + 大陆渠道只推 Pages。每季用大陆抽测复评本表。`shared/china-pages.json` 已预留 `"mirrorUrl": ""`（空 = 未启用）。

### popup CTA `utm_source=extension`

扩展不可达大按钮打开 `https://otas0.github.io/buusdocst/?utm_source=extension`（仍只开 Pages，不经 Workers）。用于日后若启用 Pages 分析时区分扩展来源；可去掉参数，不影响产品行为。

**若启用 GitHub Pages / 站点分析：** 建筛选（或 segment）`utm_source=extension`，与直接打开告知书的流量分开看。不要用该参数推断 Workers 触达率。

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
