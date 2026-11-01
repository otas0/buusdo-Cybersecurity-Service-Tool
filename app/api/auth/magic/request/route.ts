import { createHash } from "node:crypto";
import { rateLimit } from "../../../../../security/rate-limit";
import { createMagicChallenge } from "../../../../../security/account-sync/auth";
import type { AccountClient } from "../../../../../security/account-sync/store";
import { normalizeEmail } from "../../../../../security/account-sync/store";
import {
  accountCors,
  jsonErr,
  jsonOk,
  requireAccountSync
} from "../../../../../security/account-sync/http";
import { sendMagicLinkEmail, shouldReturnDevLink } from "../../../../../security/account-sync/mail";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: accountCors(request) });
}

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function emailHash(email: string): string {
  return createHash("sha256").update(email).digest("hex").slice(0, 16);
}

export async function POST(request: Request) {
  const gated = requireAccountSync(request);
  if (gated) return gated;

  const ip = request.headers.get("x-forwarded-for") || "local";
  const rlIp = rateLimit(`auth-magic-ip:${ip}`);
  if (!rlIp.ok) {
    return jsonErr(request, 429, "rate-limited", { retryAfterSec: rlIp.retryAfterSec });
  }

  let body: { email?: string; client?: string };
  try {
    body = (await request.json()) as { email?: string; client?: string };
  } catch {
    return jsonErr(request, 400, "invalid-json");
  }

  const email = normalizeEmail(body.email || "");
  if (!email || !email.includes("@") || email.length > 254) {
    return jsonErr(request, 400, "email-required");
  }

  const rlEmail = rateLimit(`auth-magic-email:${emailHash(email)}`);
  if (!rlEmail.ok) {
    return jsonErr(request, 429, "rate-limited", { retryAfterSec: rlEmail.retryAfterSec });
  }

  const clientRaw = body.client || "web";
  const client: AccountClient =
    clientRaw === "extension" || clientRaw === "desktop" || clientRaw === "web"
      ? clientRaw
      : "web";

  const { token, expiresAt } = createMagicChallenge(email, client);
  const consumeUrl = `${siteBase()}/api/auth/magic/consume?token=${encodeURIComponent(token)}&client=${client}`;

  const mail = await sendMagicLinkEmail({ to: email, consumeUrl, expiresAt });
  if (!mail.ok) {
    return jsonErr(request, 502, mail.error);
  }

  const returnLink = shouldReturnDevLink();
  if (process.env.NODE_ENV !== "production") {
    console.info("[account-sync] magic link for", email, "(token omitted from structured logs)");
  }

  return jsonOk(request, {
    sent: true,
    expiresAt,
    provider: mail.provider,
    ...(returnLink ? { devLink: consumeUrl } : {})
  });
}