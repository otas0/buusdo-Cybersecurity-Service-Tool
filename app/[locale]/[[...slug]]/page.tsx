import { AppShell } from "../../../components/AppShell";
import type { Locale } from "../../../i18n/messages";
import { getMessages } from "../../../i18n/messages";
import {
  LOCALE_IDS,
  isLocale,
  localeAliasTarget,
  normalizeLocale
} from "../../../i18n/locales";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export function generateStaticParams() {
  return LOCALE_IDS.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : normalizeLocale(raw)) as Locale;
  const t = getMessages(locale);
  const title = t.prototype;
  const description = `${t.prototype}. ${t.check}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: "/og.png", width: 1672, height: 941, alt: title }]
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] }
  };
}

export default async function LocalisedPage({
  params
}: {
  params: Promise<{ locale: string; slug?: string[] }>;
}) {
  const { locale: raw, slug = [] } = await params;
  const alias = localeAliasTarget(raw);
  if (alias) {
    const rest = slug.length ? `/${slug.join("/")}` : "";
    redirect(`/${alias}${rest}`);
  }
  if (!isLocale(raw)) notFound();
  return <AppShell locale={raw as Locale} slug={slug} />;
}
