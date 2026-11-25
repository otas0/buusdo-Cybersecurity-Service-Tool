/**
 * Client fallback when Workers HTML loads but CF did not 302 (e.g. cf.country ≠ CN
 * while locale+tz still look mainland). Does NOT help if TCP to workers.dev fails —
 * open https://otas0.github.io/buusdocst/ directly in that case.
 *
 * Primary enforcement remains Worker wrap request.cf.country (run_worker_first).
 */
export function ChinaMainlandSoftTip() {
  const src = `(function(){try{
var p=location.pathname||"";
if(p.indexOf("/api/")===0)return;
if(/china_workers_stay=1/.test(location.search||""))return;
if(document.cookie.indexOf("buusdocst-china-workers-stay=1")>=0)return;
if(sessionStorage.getItem("buusdocst-china-client-redirect")==="1")return;
var langs=[];
try{langs=navigator.languages?Array.from(navigator.languages):[navigator.language];}catch(e){}
var zh=langs.some(function(l){l=String(l||"").toLowerCase();return l==="zh-cn"||l.indexOf("zh-cn")===0||l==="zh"||l.indexOf("zh-hans")===0;});
var tz="";
try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"";}catch(e){}
var cnTz=/^Asia\\/(Shanghai|Chongqing|Harbin|Urumqi|Kashgar)$/.test(tz);
if(!(zh&&cnTz))return;
sessionStorage.setItem("buusdocst-china-client-redirect","1");
var dest="https://otas0.github.io/buusdocst/";
if(p==="/en"||p.indexOf("/en/")===0)dest="https://otas0.github.io/buusdocst/en.html";
location.replace(dest);
}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: src }} />;
}
