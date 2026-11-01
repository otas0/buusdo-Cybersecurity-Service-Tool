import { rateLimit } from "../../../../security/rate-limit";
import { refreshAccessToken } from "../../../../security/account-sync/auth";
import {
  accountCors,
  jsonErr,
  jsonOk,
  requireAccountSync
} from "../../../../security/account-sync/http";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: accountCors(request) });
}

export async function POST(request: Request) {
  const gated = requireAccountSync(request);
  if (gated) return gated;

  const rl = rateLimit(`auth-refresh:${request.headers.get("x-forwarded-for") || "local"}`);
  if (!rl.ok) {
    return jsonErr(request, 429, "rate-limited", { retryAfterSec: rl.retryAfterSec });
  }

  let body: { refreshToken?: string };
  try {
    body = (await request.json()) as { refreshToken?: string };
  } catch {
    return jsonErr(request, 400, "invalid-json");
  }

  const result = refreshAccessToken(body.refreshToken || "");
  if (!result.ok) return jsonErr(request, 401, result.error);

  return jsonOk(request, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: result.expiresAt
  });
}