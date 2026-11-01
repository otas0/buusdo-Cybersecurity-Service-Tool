import {
  consumeMagicToken,
  sessionCookieHeader
} from "../../../../../security/account-sync/auth";
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

export async function GET(request: Request) {
  const gated = requireAccountSync(request);
  if (gated) return gated;

  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const result = consumeMagicToken(token);
  if (!result.ok) {
    return jsonErr(request, 400, result.error);
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

  if (result.client === "web") {
    const headers = new Headers(accountCors(request));
    headers.set("Set-Cookie", sessionCookieHeader(result.sessionToken));
    headers.set("Location", `${site}/en/settings#settings-account`);
    return new Response(null, { status: 302, headers });
  }

  return jsonOk(request, {
    deviceCode: result.deviceCode,
    email: result.user.email,
    client: result.client
  });
}

/** POST body { token } for clients that prefer JSON over redirect. */
export async function POST(request: Request) {
  const gated = requireAccountSync(request);
  if (gated) return gated;

  let body: { token?: string };
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return jsonErr(request, 400, "invalid-json");
  }
  const result = consumeMagicToken(body.token || "");
  if (!result.ok) return jsonErr(request, 400, result.error);

  if (result.client === "web") {
    const res = jsonOk(request, { email: result.user.email, client: "web" });
    res.headers.set("Set-Cookie", sessionCookieHeader(result.sessionToken));
    return res;
  }

  return jsonOk(request, {
    deviceCode: result.deviceCode,
    email: result.user.email,
    client: result.client
  });
}