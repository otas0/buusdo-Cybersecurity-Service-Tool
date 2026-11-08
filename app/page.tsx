import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { localeFromAcceptLanguage } from "../lib/accept-language";

/** First hit: Prefer Accept-Language shipped locale, else EN. */
export default async function Page() {
  const h = await headers();
  const suggested = localeFromAcceptLanguage(h.get("accept-language"));
  redirect(`/${suggested || "en"}`);
}
