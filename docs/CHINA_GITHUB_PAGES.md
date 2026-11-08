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
| `/` (`index.html`) | 中文首页 |
| `/en.html` | English |
| `/privacy.html` | 隐私摘要（中文） |
| `/install.html` | Chrome / Safari 安装说明 |

## 与 Workers 的关系

| 表面 | 宿主 |
|------|------|
| 完整检查 / API | Cloudflare Workers `buusdocst.mtsu.workers.dev` |
| 说明、隐私摘要、安装指引（大陆友好入口） | GitHub Pages `otas0.github.io/buusdocst` |

Pages **不能**替代 `POST /api/check`。

### Halt next-steps on Pages

`index.html` / `en.html` include `#halt-next-steps` (`data-testid="china-halt-next-steps"`): the same leave / no-credentials / verify / optional-report summary as the Workers Halt result. Full interactive Halt UI (traffic lights, report draft, timing) remains on Workers `/en` only — open **打开完整检查** / **Open full check** when Cloudflare is reachable.

## 运维

- 改 `china-pages/` 后推产品仓 `main` → Actions 同步到 `buusdocst`
- 手动：Actions → **Pages China** → Run workflow
