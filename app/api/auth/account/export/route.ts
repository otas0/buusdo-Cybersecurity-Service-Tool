import { exportAccountData, sessionFromRequest } from "../../../../../security/account-sync/auth";
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

/** GDPR export — email + userId + createdAt + shield-lists-v1 only (no history). */
export async function GET(request: Request) {
  const gated = requireAccountSync(request);
  if (gated) return gated;

  const session = sessionFromRequest(request);
  if (!session) return jsonErr(request, 401, "unauthorized");

  const data = exportAccountData(session.user.id);
  if (!data) return jsonErr(request, 404, "not-found");

  return jsonOk(request, {
    export: {
      email: data.email,
      userId: data.userId,
      createdAt: data.createdAt,
      lists: data.lists,
      listsUpdatedAt: data.listsUpdatedAt
    }
  });
}