import {
  clearSessionCookieHeader,
  deleteAccountForUser,
  parseBearer,
  parseCookieToken,
  sessionFromRequest
} from "../../../../security/account-sync/auth";
import {
  accountCors,
  jsonErr,
  jsonOk,
  requireAccountSync
} from "../../../../security/account-sync/http";
import { rateLimit } from "../../../../security/rate-limit";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: accountCors(request) });
}

export async function DELETE(request: Request) {
  const gated = requireAccountSync(request);
  if (gated) return gated;

  const rl = rateLimit(`auth-delete:${request.headers.get("x-forwarded-for") || "local"}`);
  if (!rl.ok) {
    return jsonErr(request, 429, "rate-limited", { retryAfterSec: rl.retryAfterSec });
  }

  const session = sessionFromRequest(request);
  if (!session) return jsonErr(request, 401, "unauthorized");

  deleteAccountForUser(session.user.id);
  const token = parseBearer(request) || parseCookieToken(request);
  if (token) {
    /* already wiped with cascade */
  }

  const res = jsonOk(request, { deleted: true });
  res.headers.set("Set-Cookie", clearSessionCookieHeader());
  return res;
}