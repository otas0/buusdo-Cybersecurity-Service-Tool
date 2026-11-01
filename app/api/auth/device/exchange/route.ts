import { rateLimit } from "../../../../../security/rate-limit";
import { exchangeDeviceCode } from "../../../../../security/account-sync/auth";
import {
  accountCors,
  jsonErr,
  jsonOk,
  requireAccountSync
} from "../../../../../security/account-sync/http";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: accountCors(request) });
}

export async function POST(request: Request) {
  const gated = requireAccountSync(request);
  if (gated) return gated;

  const rl = rateLimit(`auth-exchange:${request.headers.get("x-forwarded-for") || "local"}`);
  if (!rl.ok) {
    return jsonErr(request, 429, "rate-limited", { retryAfterSec: rl.retryAfterSec });
  }

  let body: { deviceCode?: string };
  try {
    body = (await request.json()) as { deviceCode?: string };
  } catch {
    return jsonErr(request, 400, "invalid-json");
  }

  const result = exchangeDeviceCode(body.deviceCode || "");
  if (!result.ok) return jsonErr(request, 400, result.error);

  return jsonOk(request, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: result.expiresAt
  });
}