import { AppShell } from "../../../components/AppShell";
import type { Locale } from "../../../i18n/messages";
import type { Metadata } from "next";

export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{
  const {locale}=await params;
  const pt=locale==="pt-PT";
  const title = "buusdo Cybersecurity Service Tool";
  const description = pt
    ? "buusdo Cybersecurity Service Tool. Verifique um site antes de confiar. Inglês e português europeu."
    : "buusdo Cybersecurity Service Tool. Check a website before you trust it. English and European Portuguese.";
  return {title,description,openGraph:{title,description,images:[{url:"/og.png",width:1672,height:941,alt:title}]},twitter:{card:"summary_large_image",title,description,images:["/og.png"]}};
}

export default async function LocalisedPage({params}:{params:Promise<{locale:string;slug?:string[]}>}){
  const {locale,slug=[]}=await params;
  return <AppShell locale={(locale==="pt-PT"?"pt-PT":"en") as Locale} slug={slug}/>;
}