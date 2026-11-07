# GitHub Pages — 中国大陆访问入口

Workers（`*.workers.dev`）在部分大陆网络会 TCP 超时。产品检查 API 仍在 Cloudflare；本仓库用 **GitHub Pages** 提供可达的说明站。

## 内容

目录：[`china-pages/`](../china-pages/)

| 路径 | 用途 |
|------|------|
| `/` (`index.html`) | 中文首页 |
| `/en.html` | English |
| `/privacy.html` | 隐私摘要（中文） |
| `/install.html` | Chrome / Safari 安装说明 |

## 启用

1. Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. 推送 `china-pages/**` 或手动跑 Actions → **Pages China**
3. 站点地址一般为：  
   `https://otas0.github.io/buusdocst/`

## 与 Workers 的关系

| 表面 | 宿主 |
|------|------|
| 完整检查 / API | Cloudflare Workers `buusdocst.mtsu.workers.dev` |
| 说明、隐私摘要、安装指引（大陆友好入口） | GitHub Pages |

Pages **不能**替代 `POST /api/check`（无 Workers 出站 probe）。扩展在超时网络下会显示 CF 不可达文案。

## 运维

- 改 `china-pages/` 后推 `main` 即更新 Pages
- 商店 URL 写入 `shared/extension-stores.json` 后，可再改 `install.html` 为实链


## 旧路径说明

仓库曾名为 `preventive-cybersecurity-prototype`。旧地址
`https://otas0.github.io/preventive-cybersecurity-prototype/`
由同名仓库的静态说明页跳转到本站（浏览器跳转；GitHub Pages 不提供真正的 HTTP 301）。

自定义域名（可选）：在 `otas0/buusdocst` → Settings → Pages → Custom domain 绑定后，再跑
`npm run production:origin -- https://YOUR_DOMAIN` 并更新 `NEXT_PUBLIC_SITE_URL` /
`PRODUCTION_HEALTH_URL`（Workers 与 Pages 可分开绑域）。
