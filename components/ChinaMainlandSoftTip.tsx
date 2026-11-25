/**
 * Soft client tip only — does NOT replace Worker request.cf.country force-redirect.
 * When CF is reachable and the page loads, tip zh-CN + Asia/Shanghai users toward Pages.
 * If Workers TCP times out, this never runs — open Pages directly.
 */
export function ChinaMainlandSoftTip() {
  const src = `(function(){try{
var p=location.pathname||"";
if(p.indexOf("/api/")===0)return;
if(/china_workers_stay=1/.test(location.search||""))return;
if(document.cookie.indexOf("buusdocst-china-workers-stay=1")>=0)return;
if(sessionStorage.getItem("buusdocst-china-soft-tip")==="1")return;
var langs=[];
try{langs=navigator.languages?Array.from(navigator.languages):[navigator.language];}catch(e){}
var zh=langs.some(function(l){l=String(l||"").toLowerCase();return l==="zh-cn"||l.indexOf("zh-cn")===0||l==="zh"||l.indexOf("zh-hans")===0;});
var tz="";
try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"";}catch(e){}
var cnTz=/^Asia\\/(Shanghai|Chongqing|Harbin|Urumqi|Kashgar)$/.test(tz);
if(!(zh&&cnTz))return;
sessionStorage.setItem("buusdocst-china-soft-tip","1");
var bar=document.createElement("div");
bar.setAttribute("role","status");
bar.dataset.testid="china-mainland-soft-tip";
bar.style.cssText="position:sticky;top:0;z-index:40;padding:10px 14px;background:#1a1a1a;color:#f5f5f5;border-bottom:1px solid #ff4d00;font:14px/1.4 ui-sans-serif,system-ui,sans-serif";
bar.innerHTML='大陆网络访问 workers.dev 常超时；完整入口请打开 <a href="https://otas0.github.io/buusdocst/" rel="noopener noreferrer" style="color:#ff4d00">otas0.github.io/buusdocst</a>（Cloudflare 判定 CN 时也会强制跳转至此）。';
document.documentElement.prepend(bar);
}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: src }} />;
}
