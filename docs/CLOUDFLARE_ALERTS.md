# Cloudflare Workers alerts (errors / CPU)

Turn these on in the Cloudflare dashboard **before** public traffic. Email notifications catch Worker exceptions and CPU budget pressure during the first 48h.

## Enable

1. Open [dash.cloudflare.com](https://dash.cloudflare.com) → select the account that owns **preventive-shield**.
2. **Workers & Pages** → **preventive-shield** (or your worker name from `wrangler.jsonc`).
3. Open **Settings** → **Notifications** (or account-level **Notifications** in the sidebar).
4. Create / enable:
   - **Worker error rate** (or “Errors”) — email when exceptions spike
   - **CPU time** / usage — email when approaching the plan limit
5. Confirm the destination email is one an operator monitors (not a shared dead inbox).

Exact menu labels move occasionally; search the dashboard for “Notifications” + “Workers” if the path differs.

## Also wire

| Signal | Where |
|--------|--------|
| `GET /api/health` | GitHub Action **Production health** + repo var `PRODUCTION_HEALTH_URL` |
| `POST /api/check` | `npm run check:prod -- --url https://…` after each deploy |
| Workers analytics | Dashboard → Workers → Metrics (requests, errors, CPU) |

## First 48h

See [POST_LAUNCH_48H.md](POST_LAUNCH_48H.md): watch health + check only; do not open large new features in parallel.