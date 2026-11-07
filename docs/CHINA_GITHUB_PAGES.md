# GitHub Pages — 中国大陆访问入口

Workers（`*.workers.dev`）在部分大陆网络会 TCP 超时。产品检查 API 仍在 Cloudflare；**中国入口固定 URL**：

**https://otas0.github.io/buusdocst/**

| 角色 | 仓库 |
|------|------|
| 产品源码（唯一产品仓） | [`otas0/buusdo-Cybersecurity-Service-Tool`](https://github.com/otas0/buusdo-Cybersecurity-Service-Tool) — 目录 `china-pages/` 为源 |
| Pages 托管仓（仅静态发布） | [`otas0/buusdocst`](https://github.com/otas0/buusdocst) — 对外路径名，无产品逻辑 |

Actions **Pages China** 将 `china-pages/` 发布到 `otas0/buusdocst`（secret `BUUSDOCST_PAGES_DEPLOY_KEY`）。

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

## 运维

- 改 `china-pages/` 后推产品仓 `main` → Actions 同步到 `buusdocst`
- 手动：Actions → **Pages China** → Run workflow
