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

### 产品决策（2026-11-28）：Workers **不再**按国家强制跳转

大陆访客经常 **TCP 打不开** `*.workers.dev`，Worker 上的 CN→Pages 302 **帮不到他们**，反而会误伤能打开 Workers 的用户（日本 IP、海外中文、语言/时区启发式等）。

| 做什么 | 不做什么 |
|--------|----------|
| 告知书只走 **Pages**（本 URL）+ 商店 / QR / 海报 / 扩展「不可达」文案 | Workers / SoftTip / middleware **按 CF=CN 或语言** `302` / `location.replace` |
| wrap 仍负责 `run_worker_first` + 调试头 `x-buusdocst-china-wrap` / `cf-country` | 把 Logpush「CN 302」当大陆触达率 |

`CHINA_FORCE_REDIRECT_COUNTRIES` 与 wrap `FORCE_COUNTRIES` 均为 **空集**。客户端 SoftTip 为 **no-op**。

| 路径 | 用途 |
|------|------|
| `/` (`index.html`) | 中文告知书 + Workers 入口（手动） |
| `/en.html` | English notice + Workers entry (manual) |
| `/install.html` · `/privacy.html` | 薄跳转 → `index.html`（旧链兼容） |
| `/install-en.html` · `/privacy-en.html` | 薄跳转 → `en.html` |

顶栏：`中文 · EN`（`data-testid="china-lang-switch"`）。无站点「入口/安装/隐私」导航。

语言偏好：`lang-persist.js`（`<head>` 同步）→ `localStorage` `buusdocst-china-lang`。

## Workers wrap（无国家 302）

部署仍跑 `scripts/wrap-worker-china-cf-redirect.mjs` → `china-cf-entry.js`：

1. `assets.run_worker_first` vinext 排除列表（**禁止** boolean `true`，否则 CSS 404）
2. 调试头 + 可选注入 `cf-ipcountry` 供 `/api/geo`
3. **不**对任何 `request.cf.country` 做 HTML 302

运维：

1. `/api/health`、`/api/check`、`/api/geo` **永不** 跳转
2. 调试：`GET /api/geo` → `forceRedirectCountries: []`；响应头可有 `x-buusdocst-china-wrap: 1`
3. **先 staging 再 prod** 部署 wrap 变更
4. TCP 超时 → 直接打开本告知书（[LOCAL_CF_CONNECTIVITY.md](LOCAL_CF_CONNECTIVITY.md)）
5. 软探测 `scripts/soft-china-redirect-probe.mjs`：断言 wrap 头；**不**期望 CN 302

### 自定义域 / 非 workers.dev

自定义域（橙云 CNAME）**可能**改善连通，但不能保证；告知书入口始终保留。评估：[CUSTOM_DOMAIN_REDEPLOY.md](CUSTOM_DOMAIN_REDEPLOY.md)、[PUBLIC_PROMOTION.md](PUBLIC_PROMOTION.md)。

扩展 popup **不读 IP/国家**：只探测 `/api/health`。超时 ≠ 判定大陆。

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
