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

| 路径 | 用途 |
|------|------|
| `/` (`index.html`) | 中文告知书 + Workers 入口 |
| `/en.html` | English notice + Workers entry |
| `/install.html` · `/privacy.html` | 薄跳转 → `index.html`（旧链兼容） |
| `/install-en.html` · `/privacy-en.html` | 薄跳转 → `en.html` |

顶栏：`中文 · EN`（`data-testid="china-lang-switch"`）。无站点「入口/安装/隐私」导航。

语言偏好：`lang-persist.js`（`<head>` 同步）→ `localStorage` `buusdocst-china-lang`。

## Region auto-guide（全站）

`china-pages/region-redirect.js`（defer on **every** notice HTML; stubs jump to notice first）：

1. Opt-out: `?china_stay=1` → `localStorage buusdocst-china-stay=1`（便于阅读告知书）。清除：`?china_stay=0`（`data-testid="china-stay-clear"`）。
2. Else `GET https://buusdocst.mtsu.workers.dev/api/health`（CORS、omit credentials、~5s）。
3. If `ok && service === buusdocst` → `location.replace` Workers locale：
   - `zh-TW` / `zh-HK` / `zh-Hant` → `/zh-Hant`
   - `zh` / `zh-CN` / `zh-Hans` → `/zh-Hans`
   - `en*` → `/en`
   - else page default（中文页 `/zh-Hans`，英文页 `/en`）
4. If health fails → stay on notice；`#workers-reach` 显示不可达。

UI：`data-testid="china-notice"` / `china-notice-title` / `china-workers-entry` / `china-region-redirect-hint` / `china-stay-link`。

## 与 Workers 的关系

| 表面 | 宿主 |
|------|------|
| 完整检查 / API / 隐私 / 安装 | Cloudflare Workers `buusdocst.mtsu.workers.dev` |
| 暂停服务告知书（大陆友好静态页） | GitHub Pages `otas0.github.io/buusdocst` |

Pages **不能**替代 `POST /api/check`。正式隐私以 Workers `/zh-Hans/privacy` · `/en/privacy` 为准。

- **Do not** revive `china-pages/site-config.js` or A4 / `/promo/poster.html` CTAs.
- Poster print handoff stays on Workers `/promo/` only.

## 运维

- 改 `china-pages/` 后推产品仓 `main` → Actions 同步到 `buusdocst`
- 手动：Actions → **Pages China** → Run workflow
