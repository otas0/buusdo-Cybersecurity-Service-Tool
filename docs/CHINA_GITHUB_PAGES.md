# GitHub Pages — 中国大陆访问入口

Workers（`*.workers.dev`）在部分大陆网络会 TCP 超时。产品检查 API 仍在 Cloudflare；**中国入口固定 URL**：

**https://otas0.github.io/buusdocst/**

| 角色 | 仓库 |
|------|------|
| 产品源码（唯一产品仓） | [`otas0/buusdo-Cybersecurity-Service-Tool`](https://github.com/otas0/buusdo-Cybersecurity-Service-Tool) — 目录 `china-pages/` 为源 |
| Pages 托管仓（仅静态发布） | [`otas0/buusdocst`](https://github.com/otas0/buusdocst) — 对外路径名，无产品逻辑 |

Actions **Pages China** 将 `china-pages/` 发布到 `otas0/buusdocst`（secret `BUUSDOCST_PAGES_DEPLOY_KEY`）。

## 设计语言

与 Workers 产品站同一套 instrument 体系：`shared/tokens.css`（部署前同步到 `china-pages/assets/tokens.css`），深色场、直角、Halt `#ff4d00`、透明底深色场 wordmark（勿再套白底框）。勿单独改中国入口色板。

## 内容

| 路径 | 用途 |
|------|------|
| `/` (`index.html`) | 中文入口 |
| `/en.html` | English entry |
| `/privacy.html` | 隐私摘要（中文） |
| `/privacy-en.html` | Privacy summary (English) |
| `/install.html` | 安装说明（中文） |
| `/install-en.html` | Install (English) |

每一页顶栏统一：`中文 · EN`（`data-testid="china-lang-switch"`）+ 站点导航（入口/安装/隐私 或 Entry/Install/Privacy）。三对中英页面内容对等，无「仅中文子页」死链。

语言偏好：`lang-persist.js`（`<head>` 同步加载，先于 `reachability.js` defer）把选择写入 `localStorage`（`buusdocst-china-lang`）。顶栏 `中文` / `EN` 带 `data-china-lang`；显式切换用 session 标记，避免「点了 EN 再点中文又跳回 EN」。选 EN 后打开中文 URL（如 `/` 或 `install.html`）会落到对应英文页。`survey-round2.html` 不挂产品导航、不加载 `lang-persist.js`。

**本地验证默认中文：** 打开 Pages 任意页 → DevTools → Application → Local Storage → 删除 `buusdocst-china-lang`（并清 `sessionStorage` 的 `buusdocst-china-lang-nav`）→ 再打开 `/` 或 `install.html`，应停在中文页。

## 与 Workers 的关系

| 表面 | 宿主 |
|------|------|
| 完整检查 / API | Cloudflare Workers `buusdocst.mtsu.workers.dev` |
| 说明、隐私摘要、安装指引（大陆友好入口） | GitHub Pages `otas0.github.io/buusdocst` |

Pages **不能**替代 `POST /api/check`。

### Workers locale 对照（China Pages → Workers）

| China Pages | Workers 完整检查 / 设置 / 隐私 |
|-------------|--------------------------------|
| 中文页（`index` / `install` / `privacy`） | `/zh-Hans`、`/zh-Hans/settings#settings-desktop`、`/zh-Hans/privacy` |
| 英文页（`en` / `install-en` / `privacy-en`） | `/en`、`/en/settings#settings-desktop`、`/en/privacy` |

别名：`/zh`、`/zh-CN`、`/zh-SG` 在 Workers 上 **redirect → `/zh-Hans`**；`/zh-TW`、`/zh-HK` → `/zh-Hant`（避免旧链 404）。简体文案包：`i18n/packs/zh-Hans.json`。摘要对齐清单见 `docs/CHINA_PRIVACY_DIFF.md`。

Pacific / SEA 语言（mi、id、ms、th、vi、fil、km、lo、my）已从 catalog **暂撤**，待真实文案包就绪后再加回。

### Halt next-steps on Pages

`index.html` / `en.html` include `#halt-next-steps` (`data-testid="china-halt-next-steps"`): the same leave / no-credentials / verify / optional-report summary as the Workers Halt result. Full interactive Halt UI remains on Workers (`/zh-Hans` or `/en`) — open **打开完整检查** / **Open full check** when Cloudflare is reachable.

## 运维

- 改 `china-pages/` 后推产品仓 `main` → Actions 同步到 `buusdocst`
- 手动：Actions → **Pages China** → Run workflow
