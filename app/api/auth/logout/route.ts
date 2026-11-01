import {
  clearSessionCookieHeader,
  parseBearer,
  parseCookieToken,
  revokeSessionToken
} from "../../../../security/account-sync/auth";
import {
  accountCors,
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

  const token = parseBearer(request) || parseCookieToken(request);
  if (token) revokeSessionToken(token);

  const res = jsonOk(request, { signedOut: true });
  res.headers.set("Set-Cookie", clearSessionCookieHeader());
  return res;
}