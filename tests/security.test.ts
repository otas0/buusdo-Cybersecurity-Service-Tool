import test from "node:test";
import assert from "node:assert/strict";
import { parseUrl, getRegistrableDomain, analyseSimilarity } from "../security/url";
import { verifyIdentity } from "../security/identity";
import {
  checkThreat,
  curatedPtHosts,
  LocalThreatIntelProvider,
  OnlineThreatIntelProviderPlaceholder
} from "../security/threat-intel";
import { setRuntimeOwnThreatMergePt } from "../security/env-local";
import { assessRisk } from "../security/risk";
import { analyseUrl } from "../security/analyse";
import { scenarios } from "../security/scenarios";
import { BLOCK_KEY, isStored, readEntries, removeEntry, saveEntry } from "../security/storage";
import { messages } from "../i18n/messages";

test("parses a complete URL into explainable parts",()=>{const p=parseUrl("https://secure.example.com/login?q=1");assert.equal(p.protocol,"https");assert.equal(p.hostname,"secure.example.com");assert.equal(p.registrableDomain,"example.com");assert.equal(p.subdomain,"secure");assert.equal(p.path,"/login?q=1");assert.equal(p.usesHttps,true)});
test("adds https for a bare domain",()=>assert.equal(parseUrl("example.com/login").fullUrl,"https://example.com/login"));
test("handles common multi-part public suffixes",()=>assert.equal(getRegistrableDomain("login.example.com.pt"),"example.com.pt"));
test("finds the controlling domain in a misleading hostname",()=>{const p=parseUrl("https://lusitaniabank.test.attacker-demo.test/login");assert.equal(p.registrableDomain,"attacker-demo.test");assert.equal(p.subdomain,"lusitaniabank.test")});
test("matches a verified fictional identity",()=>assert.equal(verifyIdentity(parseUrl("https://lusitaniabank.test"),"lusitania-bank").state,"VERIFIED_MATCH"));
test("detects an identity mismatch",()=>assert.equal(verifyIdentity(parseUrl("https://other.test"),"lusitania-bank").state,"DOMAIN_MISMATCH"));
test("detects lookalike similarity without calling it proof",()=>{const result=analyseSimilarity(parseUrl("https://lusitaniabarnk.test"),["lusitaniabank.test"]);assert.equal(result.similar,true);assert.ok(result.distance<=2)});
test("detects punycode as an IDN signal",()=>assert.equal(parseUrl("https://xn--80ak6aa92e.test").hasPunycode,true));
test("local provider returns a known phishing state",async()=>assert.equal((await new LocalThreatIntelProvider().checkDomain("lusitania-bank-login.test")).state,"KNOWN_PHISHING"));
test("PT merge off drops caixa-secure-login.example from own list",async()=>{
  const prev=process.env.OWN_THREAT_MERGE_PT;
  process.env.OWN_THREAT_MERGE_PT="0";
  setRuntimeOwnThreatMergePt("0");
  try{
    assert.equal(Object.keys(curatedPtHosts()).length,0);
    assert.equal((await new LocalThreatIntelProvider().checkDomain("caixa-secure-login.example")).state,"NO_KNOWN_MATCH");
  }finally{
    setRuntimeOwnThreatMergePt(null);
    if(prev===undefined) delete process.env.OWN_THREAT_MERGE_PT;
    else process.env.OWN_THREAT_MERGE_PT=prev;
  }
});
test("PT merge on lists caixa-secure-login.example",async()=>{
  const prev=process.env.OWN_THREAT_MERGE_PT;
  delete process.env.OWN_THREAT_MERGE_PT;
  setRuntimeOwnThreatMergePt("1");
  try{
    assert.equal(curatedPtHosts()["caixa-secure-login.example"],"KNOWN_PHISHING");
    assert.equal((await new LocalThreatIntelProvider().checkDomain("caixa-secure-login.example")).state,"KNOWN_PHISHING");
  }finally{
    setRuntimeOwnThreatMergePt(null);
    if(prev===undefined) delete process.env.OWN_THREAT_MERGE_PT;
    else process.env.OWN_THREAT_MERGE_PT=prev;
  }
});
test("unconfigured online provider is explicitly unavailable",async()=>assert.equal((await new OnlineThreatIntelProviderPlaceholder().checkDomain("example.test")).state,"PROVIDER_UNAVAILABLE"));
test("a lookalike host is flagged by live address signals",async()=>assert.equal((await checkThreat(parseUrl("https://paypal.secure-login.example/signin"))).state,"KNOWN_PHISHING"));
test("the real PayPal host is not flagged as phishing",async()=>assert.equal((await checkThreat(parseUrl("https://www.paypal.com/signin"))).state,"NO_KNOWN_MATCH"));
test("auto-infers brand impersonation into an identity mismatch",async()=>{const result=await analyseUrl("https://paypal.secure-login.example/signin");assert.equal(result.inferredOrganisationId,"paypal");assert.equal(result.identity.state,"DOMAIN_MISMATCH")});
test("auto-infers an official brand domain as a verified match",async()=>{const result=await analyseUrl("https://www.paypal.com/signin");assert.equal(result.inferredOrganisationId,"paypal");assert.equal(result.identity.state,"VERIFIED_MATCH")});
test("any website gets structural evidence without a brand claim",async()=>{const result=await analyseUrl("https://example.com/");assert.ok(result.risk.evidence.some((item)=>item.id==="checked-address"));assert.ok(result.risk.evidence.some((item)=>item.id==="no-match"||item.id==="scope-limit"));assert.equal(result.identity.state,"NO_CLAIM")});
test("analyseWebsite reports stage timings for probe tuning",async()=>{const result=await analyseUrl("https://example.com/");assert.ok(result.timing);assert.ok(result.timing.parseMs>=0);assert.ok(result.timing.threatMs>=0);assert.equal(result.timing.probeMs,null);assert.ok(result.timing.totalMs>=0);assert.ok(result.timing.probeTimeoutMs>0);assert.equal(result.timing.probeHeadFailed,false);assert.equal(result.timing.headSkipped,false)});
test("timed-out live probe surfaces probe-timeout evidence",async()=>{const {analyseWebsite}=await import("../security/analyse");const live={resolved:false,addresses:[],reachable:false,statusCode:null,finalUrl:null,redirectChain:[],redirected:false,crossDomainRedirect:false,tlsOk:null,error:"timeout",timedOut:true};const result=await analyseWebsite("https://slow-probe.test/",{live});assert.ok(result.risk.evidence.some((item)=>item.id==="probe-timeout"))});
test("plain HTTP on an ordinary host raises caution",async()=>{const result=await analyseUrl("http://example.com/");assert.equal(result.risk.level,"CAUTION");assert.ok(result.risk.evidence.some((item)=>item.id==="http"))});
test("no-match risk wording is not a safety claim",()=>{const p=parseUrl("https://example.test");const risk=assessRisk(p,{state:"NO_KNOWN_MATCH",providerName:"test",checkedAt:"now",evidence:[]},{state:"NO_CLAIM"},null);assert.equal(risk.level,"LOW_EVIDENCE");assert.match(risk.evidence[0].detail,/not proof.*safe/i)});
test("HTTPS alone does not produce verified identity or a safety claim",()=>{const p=parseUrl("https://ordinary.test");const identity=verifyIdentity(p);const risk=assessRisk(p,{state:"NO_KNOWN_MATCH",providerName:"test",checkedAt:"now",evidence:[]},identity,null);assert.equal(identity.state,"NO_CLAIM");assert.equal(risk.level,"LOW_EVIDENCE");assert.ok(risk.evidence.some(e=>e.id==="https-limit"))});
test("identity match remains limited evidence rather than a safe verdict",()=>{const p=parseUrl("https://lusitaniabank.test");const risk=assessRisk(p,{state:"NO_KNOWN_MATCH",providerName:"test",checkedAt:"now",evidence:[]},verifyIdentity(p,"lusitania-bank"),null);assert.equal(risk.level,"LOW_EVIDENCE");assert.match(risk.limitations.join(" "),/does not guarantee/i)});
test("malicious reputation deterministically increases severity",()=>{const p=parseUrl("https://malicious-demo.test");const risk=assessRisk(p,{state:"KNOWN_MALICIOUS",providerName:"test",checkedAt:"now",evidence:[]},{state:"NO_CLAIM"},null);assert.equal(risk.level,"HIGH");assert.equal(risk.confidence,"HIGH")});
test("benign unfamiliar domain is not automatically classified as dangerous",async()=>{const result=await analyseUrl("https://quietgarden.test/about");assert.equal(result.risk.level,"LOW_EVIDENCE");assert.equal(result.risk.recommendation,"PROCEED_WITH_CARE")});
test("deterministic scenario matrix returns expected risk and evidence",async()=>{for(const scenario of scenarios){const result=await analyseUrl(scenario.url,scenario.organisationId,scenario.sensitive);assert.equal(result.risk.level,scenario.expected,scenario.id);assert.ok(result.risk.evidence.length>=2,scenario.id)}});
test("blocklist save, verify, and removal are reversible",()=>{const data=new Map<string,string>();const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v)}};saveEntry(BLOCK_KEY,{domain:"example.test",reason:"demo",createdAt:"2026-01-01"},storage);assert.equal(isStored(BLOCK_KEY,"example.test",storage),true);assert.equal(readEntries(BLOCK_KEY,storage).length,1);removeEntry(BLOCK_KEY,"example.test",storage);assert.equal(isStored(BLOCK_KEY,"example.test",storage),false)});
test("critical safety strings exist in supported locales",()=>{for(const locale of ["en","pt-PT"] as const){assert.ok(messages[locale].block);assert.ok(messages[locale].sensitiveTitle);assert.ok(messages[locale].privacy);assert.ok(messages[locale].currentlyBlocked)}assert.match(messages["pt-PT"].sensitiveTitle,/informação/) });