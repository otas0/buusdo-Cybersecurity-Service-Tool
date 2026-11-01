import { NextResponse } from "next/server";
import { isAccountSyncEnabled } from "./enabled";

export function accountCors(request: Request): HeadersInit {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin"
  };
}

export function disabledResponse(request: Request) {
  return NextResponse.json(
    { ok: false, error: "account-sync-disabled" },
    { status: 503, headers: accountCors(request) }
  );
}

export function requireAccountSync(request: Request): NextResponse | null {
  if (!isAccountSyncEnabled()) return disabledResponse(request);
  return null;
}

export function jsonOk(request: Request, body: Record<string, unknown>, init: ResponseInit = {}) {
  const headers = { ...accountCors(request), ...(init.headers || {}) };
  return NextResponse.json({ ok: true, ...body }, { ...init, headers });
}

export function jsonErr(
  request: Request,
  status: number,
  error: string,
  extra: Record<string, unknown> = {}
) {
  return NextResponse.json({ ok: false, error, ...extra }, { status, headers: accountCors(request) });
}