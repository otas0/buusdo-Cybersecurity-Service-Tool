# Cloudflare Workers alerts (errors / CPU)

Turn these on in the Cloudflare dashboard **before** public traffic. Email notifications catch Worker exceptions and CPU budget pressure during the first 48h.

## Enable

1. Open [dash.cloudflare.com](https://dash.cloudflare.com) → select the account that owns Worker **`pcpd`** (`wrangler.jsonc` `name`).
2. **Workers & Pages** → **pcpd** (legacy name `preventive-shield` only if an old Worker still exists — do not alert the wrong script).
3. Open **Settings** → **Notifications** (or account-level **Notifications** in the sidebar).
4. Create / enable:
   - **Worker error rate** (or “Errors”) — email when exceptions spike
   - **CPU time** / usage — email when approaching the plan limit
5. Confirm the destination email is one an operator monitors (not a shared dead inbox).

Exact menu labels move occasionally; search the dashboard for “Notifications” + “Workers” if the path differs.

**Operator note (2026-11-01):** dashboard login is required — automation cannot enable alerts without an interactive Cloudflare session.

## Test one email (required before public promotion)

1. After creating the notification, open it → **Test** / **Send test notification** if the UI offers it.
2. If there is no test button: temporarily lower the error threshold, trigger a known-safe 404 storm is **not** required — instead confirm the destination appears under **Notification destinations** and that Cloudflare account email is verified.
3. Check the inbox (and spam) for a Cloudflare notification within a few minutes.
4. Tick the alert row in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) § C only after a real email arrived.

## Also wire

| Signal | Where |
|--------|--------|
| `GET /api/health` | GitHub Action **Production health** + repo var `PRODUCTION_HEALTH_URL` |
| `POST /api/check` | `npm run check:prod -- --url https://…` after each deploy (or CI) |
| Workers analytics | Dashboard → Workers → Metrics (requests, errors, CPU) |

## First 48h

See [POST_LAUNCH_48H.md](POST_LAUNCH_48H.md): watch health + check only; do not open large new features in parallel.