import { sessionFromRequest } from "../../../../security/account-sync/auth";
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

export async function GET(request: Request) {
  const gated = requireAccountSync(request);
  if (gated) return gated;

  const session = sessionFromRequest(request);
  if (!session) return jsonErr(request, 401, "unauthorized");

  return jsonOk(request, {
    email: session.user.email,
    userId: session.user.id
  });
}