/**
 * Magic-link email delivery.
 * Prefers Resend (RESEND_API_KEY), then Postmark (POSTMARK_SERVER_TOKEN).
 * In production, one of these must succeed — no silent skip.
 */

export type MagicMailResult =
  | { ok: true; provider: "resend" | "postmark" | "dev-skip" }
  | { ok: false; error: string };

function fromAddress(): string {
  return (process.env.AUTH_FROM_EMAIL || "").trim();
}

export async function sendMagicLinkEmail(opts: {
  to: string;
  consumeUrl: string;
  expiresAt: string;
}): Promise<MagicMailResult> {
  const from = fromAddress();
  const subject = "Preventive Shield sign-in link";
  const text = [
    "Sign in to Preventive Shield (personal block/trust lists sync only).",
    "",
    opts.consumeUrl,
    "",
    `This link expires at ${opts.expiresAt}.`,
    "If you did not request this, ignore this email."
  ].join("\n");
  const html = `<p>Sign in to Preventive Shield (personal block/trust lists sync only).</p>
<p><a href="${opts.consumeUrl}">Open sign-in link</a></p>
<p>This link expires at ${opts.expiresAt}.</p>
<p>If you did not request this, ignore this email.</p>`;

  const resendKey = (process.env.RESEND_API_KEY || "").trim();
  if (resendKey) {
    if (!from) return { ok: false, error: "AUTH_FROM_EMAIL-required" };
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from, to: [opts.to], subject, text, html })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `resend-${res.status}:${body.slice(0, 120)}` };
    }
    return { ok: true, provider: "resend" };
  }

  const postmarkToken = (process.env.POSTMARK_SERVER_TOKEN || "").trim();
  if (postmarkToken) {
    if (!from) return { ok: false, error: "AUTH_FROM_EMAIL-required" };
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": postmarkToken
      },
      body: JSON.stringify({
        From: from,
        To: opts.to,
        Subject: subject,
        TextBody: text,
        HtmlBody: html,
        MessageStream: "outbound"
      })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `postmark-${res.status}:${body.slice(0, 120)}` };
    }
    return { ok: true, provider: "postmark" };
  }

  if (process.env.NODE_ENV === "production") {
    return { ok: false, error: "mailer-not-configured" };
  }

  // Local/dev without SMTP — caller may still return devLink.
  return { ok: true, provider: "dev-skip" };
}

/** Never return magic URL in JSON when production. */
export function shouldReturnDevLink(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.ACCOUNT_SYNC_DEV_RETURN_LINK !== "0";
}