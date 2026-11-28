---
name: Weekly ops check (mainland + github.io)
about: Optional weekly checklist — mainland channels Pages-only + github.io / JP Workers spot-check
title: "Weekly ops: mainland channels + github.io"
labels: ops
---

## Weekly — mainland channels (告知书 only)

See [docs/OPS_RUNBOOK.md](../../docs/OPS_RUNBOOK.md) § Weekly.

- [ ] Mainland public copy is **Pages-only** (`otas0.github.io/buusdocst`) — no Workers URL in 面向大陆 paste
- [ ] `npm run assert:public-promotion` green locally / CI
- [ ] Poster China QR still「服务未开放 · 告知书」
- [ ] Chrome listing Chinese field (if used) matches ARCHIVE paste; screenshot archived if pasted this week
- [ ] Logpush: **no** “CN 302 触达 / 非触达率” dashboard annotation (product no longer emits CN→Pages 302)

## github.io 抽测（optional）

From one mainland-like path (or note if unavailable):

- [ ] `GET https://otas0.github.io/buusdocst/` → result: **ok** / **slow** / **fail**
- Date (UTC):
- Notes:

If mostly **fail**, re-open Gitee/CDN eval in [docs/CHINA_GITHUB_PAGES.md](../../docs/CHINA_GITHUB_PAGES.md).

## JP / CF-reachable Workers 抽测

From a Japan (or other non-CN) IP / network:

- [ ] Open `https://buusdocst.mtsu.workers.dev/` (or `/en`) — stays on Workers product HTML
- [ ] Does **not** 302 / land on `otas0.github.io/buusdocst`
- Date (UTC):
- Notes:
