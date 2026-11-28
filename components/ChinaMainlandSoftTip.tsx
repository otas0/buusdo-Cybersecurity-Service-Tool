/**
 * Client fallback when Workers HTML loads but CF did not 302.
 * Primary: Worker wrap request.cf.country === CN (run_worker_first).
 * This script helps when CF country ≠ CN (VPN/mis-class) but the browser
 * looks mainland (zh-CN / zh-Hans), or when /api/geo still reports CN.
 * Does NOT help if TCP to workers.dev fails — open Pages directly.
 */
export function ChinaMainlandSoftTip() {
  const src = `(function(){try{
var p=location.pathname||"";
if(p.indexOf("/api/")===0)return;
if(/china_workers_stay=1/.test(location.search||""))return;
if(document.cookie.indexOf("buusdocst-china-workers-stay=1")>=0)return;
if(sessionStorage.getItem("buusdocst-china-client-redirect")==="1")return;
var dest="https://otas0.github.io/buusdocst/";
if(p==="/en"||p.indexOf("/en/")===0)dest="https://otas0.github.io/buusdocst/en.html";
function go(reason){
try{sessionStorage.setItem("buusdocst-china-client-redirect","1");}catch(e){}
try{
var n=document.createElement("meta");
n.setAttribute("data-testid","china-mainland-client-redirect");
n.setAttribute("data-reason",String(reason||""));
document.documentElement.appendChild(n);
}catch(e){}
location.replace(dest);
}
var langs=[];
try{langs=navigator.languages?Array.from(navigator.languages):[navigator.language];}catch(e){}
var zhCN=langs.some(function(l){l=String(l||"").toLowerCase();return l==="zh-cn"||l.indexOf("zh-cn")===0||l.indexOf("zh-hans")===0;});
var zhAny=langs.some(function(l){l=String(l||"").toLowerCase();return l==="zh"||l.indexOf("zh-")===0;});
var tz="";
try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"";}catch(e){}
var cnTz=/^Asia\\/(Shanghai|Chongqing|Harbin|Urumqi|Kashgar)$/.test(tz);
if(zhCN||(zhAny&&cnTz)){go(zhCN?"zh-CN":"zh+tz");return;}
fetch("/api/geo",{credentials:"omit",cache:"no-store"}).then(function(r){return r.json();}).then(function(j){
if(!j)return;
var c=String(j.country||j.cfCountry||"").toUpperCase();
if(c==="CN")go("geo");
}).catch(function(){});
}catch(e){}})();`;
  return (
    <script
      data-testid="china-mainland-client-redirect-boot"
      dangerouslySetInnerHTML={{ __html: src }}
    />
  );
}
