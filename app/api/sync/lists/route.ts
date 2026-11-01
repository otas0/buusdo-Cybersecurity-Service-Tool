import { rateLimit } from "../../../../security/rate-limit";
import { sessionFromRequest } from "../../../../security/account-sync/auth";
import {
  accountCors,
  jsonErr,
  jsonOk,
  requireAccountSync
} from "../../../../security/account-sync/http";
import { capErrorFromUnknown } from "../../../../security/account-sync/lists-cap";
import {
  getUserLists,
  putUserLists,
  type PutConflictMode
} from "../../../../security/account-sync/lists-sync";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: accountCors(request) });
}

export async function GET(request: Request) {
  const gated = requireAccountSync(request);
  if (gated) return gated;

  const session = sessionFromRequest(request);
  if (!session) return jsonErr(request, 401, "unauthorized");

  const { backup, updatedAt } = getUserLists(session.user.id);
  const etag = updatedAt ? `"${updatedAt}"` : undefined;
  return jsonOk(request, {
    backup: backup || null,
    updatedAt: updatedAt || null,
    etag: etag || null
  });
}

export async function PUT(request: Request) {
  const gated = requireAccountSync(request);
  if (gated) return gated;

  const rl = rateLimit(`sync-lists:${request.headers.get("x-forwarded-for") || "local"}`);
  if (!rl.ok) {
    return jsonErr(request, 429, "rate-limited", { retryAfterSec: rl.retryAfterSec });
  }

  const session = sessionFromRequest(request);
  if (!session) return jsonErr(request, 401, "unauthorized");

  let body: {
    backup?: unknown;
    client?: string;
    deviceId?: string;
    baseUpdatedAt?: string | null;
    mode?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonErr(request, 400, "invalid-json");
  }

  if (body.backup == null) return jsonErr(request, 400, "backup-required");

  const ifMatch = request.headers.get("if-match");
  let baseUpdatedAt = body.baseUpdatedAt ?? null;
  if (ifMatch) {
    const m = /^"(.+)"$/.exec(ifMatch.trim());
    if (m) baseUpdatedAt = m[1]!;
  }

  const modeRaw = body.mode || "merge";
  const mode: PutConflictMode =
    modeRaw === "replace-cloud" || modeRaw === "replace-device" || modeRaw === "merge"
      ? modeRaw
      : "merge";

  try {
    const result = putUserLists(session.user.id, body.backup, baseUpdatedAt, mode);
    return jsonOk(request, {
      backup: result.backup,
      updatedAt: result.updatedAt,
      etag: result.etag,
      merged: result.merged,
      conflict: result.conflict === true
    });
  } catch (err) {
    const cap = capErrorFromUnknown(err);
    if (cap) {
      return jsonErr(request, 413, cap.code, {
        entries: cap.entries,
        maxEntries: cap.maxEntries,
        bytes: cap.bytes,
        maxBytes: cap.maxBytes
      });
    }
    const msg = err instanceof Error ? err.message : "invalid-backup";
    return jsonErr(request, 400, msg);
  }
}