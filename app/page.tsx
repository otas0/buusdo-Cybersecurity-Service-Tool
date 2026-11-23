import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { enforceChinaMainlandForceRedirect } from "../components/ChinaMainlandForceRedirect";
import { localeFromAcceptLanguage } from "../lib/accept-language";

/** First hit: Prefer Accept-Language shipped locale, else EN. */
export default async function Page({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  await enforceChinaMainlandForceRedirect({ pathname: "/", searchParams: sp });
  const h = await headers();
  const suggested = localeFromAcceptLanguage(h.get("accept-language"));
  redirect(`/${suggested || "en"}`);
}
