#!/usr/bin/env node
/**
 * Inject RiskResult / privacy / locale-recommend keys into messages.ts (en + pt-PT)
 * and refresh _en.snapshot.json / _pt-PT.snapshot.json tails.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const EN = {
  statusKicker: "Status",
  navAriaLabel: "Navigation",
  partialPackBanner:
    "Some longer Privacy and Settings text is still in English for this language. Chrome and Halt steps are translated.",
  localeRecommendTitle: "Choose your language",
  localeRecommendBody: "Based on your browser, we suggest {lang}. You can change this anytime in the header.",
  localeRecommendAccept: "Use {lang}",
  localeRecommendDismiss: "Not now",
  whyEmpty: "No strong signals beyond the usual limitations.",
  levelCriticalLabel: "Critical risk",
  levelCriticalNote: "Strong evidence indicates that you should leave before entering information.",
  levelHighLabel: "High risk",
  levelHighNote: "Multiple documented warning signals need immediate attention.",
  levelCautionLabel: "Caution",
  levelCautionNote: "Important uncertainty or warning signals were found.",
  levelLowEvidenceLabel: "Limited risk evidence",
  levelLowEvidenceNote: "No known threat was found in the sources checked.",
  levelUnknownLabel: "Unknown",
  levelUnknownNote: "There is not enough evidence to reach a confident conclusion.",
  kindDomain: "Domain",
  kindReputation: "Reputation (own list)",
  kindRequest: "Request",
  kindEvidence: "Evidence",
  kindSource: "Source",
  kindProtocol: "Protocol",
  kindSubdomain: "Subdomain",
  kindRedirects: "Redirects",
  kindTiming: "Timing",
  kindLimit: "Limit",
  kindKnown: "known",
  kindLikely: "likely",
  kindSignal: "signal",
  kindUnknown: "unknown",
  kindLimitation: "limitation",
  confidenceHigh: "HIGH",
  confidenceModerate: "MODERATE",
  confidenceLimited: "LIMITED",
  reputationKnownMalicious: "KNOWN MALICIOUS",
  reputationKnownPhishing: "KNOWN PHISHING",
  reputationNoKnownMatch: "NO KNOWN MATCH",
  reputationUnknown: "UNKNOWN",
  reputationProviderUnavailable: "LIST UNAVAILABLE",
  sensitivePassword: "password",
  sensitivePayment: "payment details",
  sensitivePersonal: "personal information",
  sensitivePermission: "permission",
  sensitiveNone: "None",
  recommendationLeaveAndBlock: "Leave and block this domain (in the extension or desktop app)",
  recommendationLeave: "Leave this website",
  recommendationVerify: "Verify independently",
  recommendationProceed: "Proceed with care",
  protocolEncrypted: "· encrypted connection",
  protocolUnencrypted: "· not encrypted",
  desktopBlockNeedOpen: "Open the buusdo desktop app first (localhost:3010), then try again.",
  desktopBlockCta: "Block on desktop (buusdo)",
  evidenceKnownThreatTitle: "Known threat signal",
  evidenceKnownThreatDetail: "This address matched buusdo’s own threat list.",
  evidenceNoMatchTitle: "No known threat on lists",
  evidenceNoMatchDetail: "No known threat was found on the own list. This does not prove the site is safe.",
  evidenceUnknownReputationTitle: "Unknown reputation",
  evidenceUnknownReputationDetail: "The own list does not provide a positive or negative result.",
  evidenceProviderUnavailableTitle: "Threat list unavailable",
  evidenceProviderUnavailableDetail: "The own list could not be read. Structural and live checks continued.",
  evidenceIdentityMatchTitle: "Domain matches a known organisation",
  evidenceIdentityMatchDetail: "The registrable domain matches {name}. This does not mean the site is safe.",
  evidenceIdentityMismatchTitle: "Looks like a known organisation, but the domain does not match",
  evidenceIdentityMismatchDetail:
    "The address looks related to {name}, but the controlling domain is {domain}.",
  evidenceMisleadingSubdomainTitle: "Misleading subdomain signal",
  evidenceMisleadingSubdomainDetail:
    "A name resembling an organisation appears before the controlling domain {domain}.",
  evidenceLookalikeTitle: "Domain lookalike signal",
  evidenceLookalikeDetail: "This domain looks similar to a known domain. Similarity is a signal, not proof of phishing.",
  evidencePunycodeTitle: "Encoded internationalised domain",
  evidencePunycodeDetail: "The address contains punycode. It may be legitimate, but lookalike characters need care.",
  evidenceHttpTitle: "Unencrypted connection",
  evidenceHttpDetail: "Information sent over HTTP may be exposed in transit.",
  evidenceSensitivePathTitle: "Sensitive page path",
  evidenceSensitivePathDetail:
    "The path suggests the page may ask for sensitive information. Confirm the domain independently.",
  evidenceCheckedAddressTitle: "Address analysed",
  evidenceCheckedAddressDetail: "Checked {domain}.",
  evidenceDnsOkTitle: "Host reachable",
  evidenceDnsOkDetail: "The live check reached the host.",
  evidenceDnsFailTitle: "Host not reached",
  evidenceDnsFailDetail: "The host did not respond. The site may be mistyped or unreachable.",
  evidenceHttpStatusTitle: "The site responded",
  evidenceHttpStatusDetail: "An HTTP response was received.",
  evidenceRedirectChainTitle: "Redirect chain",
  evidenceRedirectChainDetail: "The request followed one or more redirects.",
  evidenceCrossRedirectTitle: "Redirect to another domain",
  evidenceCrossRedirectDetail: "The address redirected to another registrable domain.",
  evidenceRedirectTitle: "The address redirects",
  evidenceRedirectDetail: "The request followed a redirect.",
  evidenceUnreachableTitle: "The site did not respond",
  evidenceUnreachableDetail: "The live request failed.",
  evidenceTlsFailTitle: "TLS / certificate problem",
  evidenceTlsFailDetail: "HTTPS could not be validated. Do not enter sensitive information.",
  evidenceIpHostTitle: "Numeric address",
  evidenceIpHostDetail: "The site is reached by IP instead of a normal domain name.",
  evidenceRiskyTldTitle: "Uncommon domain ending",
  evidenceRiskyTldDetail: "This ending is used more often in phishing campaigns. Alone it does not prove harm.",
  evidenceDeepSubdomainTitle: "Unusual subdomain chain",
  evidenceDeepSubdomainDetail: "Long subdomain chains are sometimes used to look official.",
  evidenceSecretQueryTitle: "Secret in the link",
  evidenceSecretQueryDetail: "The address puts a secret in the query. The value was not stored.",
  evidenceProbeTimeoutTitle: "Live check timed out",
  evidenceProbeTimeoutDetail: "The site did not respond in time.",
  evidenceHttpsLimitTitle: "HTTPS does not prove identity or trust",
  evidenceHttpsLimitDetail: "HTTPS protects the connection, but does not prove who runs the site or that it is trustworthy.",
  evidenceScopeLimitTitle: "Scope of this check",
  evidenceScopeLimitDetail:
    "We analyse the address with the own list, lookalike brands, DNS, reachability and redirects. We do not send the URL to third-party services.",
  evidenceUserBlockTitle: "Personal block list",
  evidenceUserBlockDetail: "This host is on your personal list (extension or app). The site did not store the list.",
  limitationFalsePosNeg: "Signals can produce false positives or false negatives.",
  limitationNoContent: "This check does not analyse page content or prove who controls a domain.",
  limitationIdentityNotSafe: "An identity match does not guarantee that every action on a site is safe.",
  limitationNoThirdParty:
    "URLs are not sent to Google Safe Browsing or other third-party reputation services."
};

const PT = {
  statusKicker: "Estado",
  navAriaLabel: "Navegação",
  partialPackBanner:
    "Parte do texto longo de Privacidade e Definições ainda está em inglês neste idioma. O chrome e os passos Parar estão traduzidos.",
  localeRecommendTitle: "Escolha o idioma",
  localeRecommendBody: "Com base no seu navegador, sugerimos {lang}. Pode mudar a qualquer momento no cabeçalho.",
  localeRecommendAccept: "Usar {lang}",
  localeRecommendDismiss: "Agora não",
  whyEmpty: "Nenhum sinal forte além das limitações habituais.",
  levelCriticalLabel: "Risco crítico",
  levelCriticalNote: "Há provas fortes de que deve sair antes de introduzir informação.",
  levelHighLabel: "Risco elevado",
  levelHighNote: "Vários sinais documentados exigem atenção imediata.",
  levelCautionLabel: "Cuidado",
  levelCautionNote: "Foram encontrados sinais de alerta ou incerteza importantes.",
  levelLowEvidenceLabel: "Provas de risco limitadas",
  levelLowEvidenceNote: "Não foi encontrada nenhuma ameaça conhecida nas fontes verificadas.",
  levelUnknownLabel: "Desconhecido",
  levelUnknownNote: "Não existem provas suficientes para uma conclusão segura.",
  kindDomain: "Domínio",
  kindReputation: "Reputação (lista própria)",
  kindRequest: "Pedido",
  kindEvidence: "Provas",
  kindSource: "Fonte",
  kindProtocol: "Protocolo",
  kindSubdomain: "Subdomínio",
  kindRedirects: "Redirecionamentos",
  kindTiming: "Tempo",
  kindLimit: "Limite",
  kindKnown: "conhecido",
  kindLikely: "provável",
  kindSignal: "sinal",
  kindUnknown: "desconhecido",
  kindLimitation: "limitação",
  confidenceHigh: "ALTA",
  confidenceModerate: "MODERADA",
  confidenceLimited: "LIMITADA",
  reputationKnownMalicious: "MALICIOSO CONHECIDO",
  reputationKnownPhishing: "PHISHING CONHECIDO",
  reputationNoKnownMatch: "NENHUMA CORRESPONDÊNCIA CONHECIDA",
  reputationUnknown: "DESCONHECIDA",
  reputationProviderUnavailable: "LISTA INDISPONÍVEL",
  sensitivePassword: "palavra-passe",
  sensitivePayment: "dados de pagamento",
  sensitivePersonal: "informação pessoal",
  sensitivePermission: "permissão",
  sensitiveNone: "Nenhum",
  recommendationLeaveAndBlock: "Saia e bloqueie este domínio (na extensão ou app)",
  recommendationLeave: "Saia deste site",
  recommendationVerify: "Verifique de forma independente",
  recommendationProceed: "Prossiga com cuidado",
  protocolEncrypted: "· ligação encriptada",
  protocolUnencrypted: "· não encriptada",
  desktopBlockNeedOpen: "Abra primeiro o desktop buusdo (localhost:3010), depois tente de novo.",
  desktopBlockCta: "Bloquear no desktop (buusdo)",
  evidenceKnownThreatTitle: "Sinal de ameaça conhecido",
  evidenceKnownThreatDetail: "Este endereço correspondeu à lista própria do buusdo.",
  evidenceNoMatchTitle: "Nenhuma ameaça conhecida nas listas",
  evidenceNoMatchDetail: "Não foi encontrada nenhuma ameaça conhecida na lista própria. Isto não prova que o site seja seguro.",
  evidenceUnknownReputationTitle: "Reputação desconhecida",
  evidenceUnknownReputationDetail: "A lista própria não fornece um resultado positivo nem negativo.",
  evidenceProviderUnavailableTitle: "Lista de ameaças indisponível",
  evidenceProviderUnavailableDetail: "A lista própria não pôde ser lida. As verificações estruturais e em direto continuaram.",
  evidenceIdentityMatchTitle: "O domínio corresponde a uma organização conhecida",
  evidenceIdentityMatchDetail: "O domínio registável corresponde a {name}. Isto não significa que o site seja seguro.",
  evidenceIdentityMismatchTitle: "Parece uma organização conhecida, mas o domínio não corresponde",
  evidenceIdentityMismatchDetail:
    "O endereço parece relacionado com {name}, mas o domínio de controlo é {domain}.",
  evidenceMisleadingSubdomainTitle: "Sinal de subdomínio enganador",
  evidenceMisleadingSubdomainDetail:
    "Um nome parecido com uma organização aparece antes do domínio de controlo {domain}.",
  evidenceLookalikeTitle: "Sinal de semelhança do domínio",
  evidenceLookalikeDetail: "Este domínio parece-se com um domínio conhecido. A semelhança é um sinal, não prova de phishing.",
  evidencePunycodeTitle: "Domínio internacionalizado codificado",
  evidencePunycodeDetail: "O endereço contém punycode. Pode ser legítimo, mas caracteres visualmente confusos exigem cuidado.",
  evidenceHttpTitle: "Ligação não encriptada",
  evidenceHttpDetail: "A informação enviada por HTTP pode ficar exposta durante a transmissão.",
  evidenceSensitivePathTitle: "Caminho de página sensível",
  evidenceSensitivePathDetail:
    "O caminho sugere que a página pode pedir informação sensível. Confirme o domínio de forma independente.",
  evidenceCheckedAddressTitle: "Endereço analisado",
  evidenceCheckedAddressDetail: "Verificado {domain}.",
  evidenceDnsOkTitle: "Anfitrião acessível",
  evidenceDnsOkDetail: "A verificação em direto alcançou o anfitrião.",
  evidenceDnsFailTitle: "O anfitrião não foi alcançado",
  evidenceDnsFailDetail: "O anfitrião não respondeu. O site pode estar mal escrito ou inacessível.",
  evidenceHttpStatusTitle: "O site respondeu",
  evidenceHttpStatusDetail: "Foi recebida uma resposta HTTP.",
  evidenceRedirectChainTitle: "Cadeia de redirecionamentos",
  evidenceRedirectChainDetail: "O pedido seguiu um ou mais redirecionamentos.",
  evidenceCrossRedirectTitle: "Redirecionamento para outro domínio",
  evidenceCrossRedirectDetail: "O endereço redirecionou para outro domínio registável.",
  evidenceRedirectTitle: "O endereço redireciona",
  evidenceRedirectDetail: "O pedido seguiu um redirecionamento.",
  evidenceUnreachableTitle: "O site não respondeu",
  evidenceUnreachableDetail: "O pedido em direto falhou.",
  evidenceTlsFailTitle: "Problema de TLS / certificado",
  evidenceTlsFailDetail: "O HTTPS não pôde ser validado. Não introduza informação sensível.",
  evidenceIpHostTitle: "Endereço numérico",
  evidenceIpHostDetail: "O site é acedido por IP em vez de um nome de domínio normal.",
  evidenceRiskyTldTitle: "Terminação de domínio pouco comum",
  evidenceRiskyTldDetail: "Esta terminação é mais usada em campanhas de phishing. Por si só não prova dano.",
  evidenceDeepSubdomainTitle: "Cadeia de subdomínios invulgar",
  evidenceDeepSubdomainDetail: "Subdomínios longos às vezes são usados para parecer oficiais.",
  evidenceSecretQueryTitle: "Segredo no link",
  evidenceSecretQueryDetail: "O endereço coloca um segredo na query. O valor não foi guardado.",
  evidenceProbeTimeoutTitle: "A verificação em direto expirou",
  evidenceProbeTimeoutDetail: "O site não respondeu a tempo.",
  evidenceHttpsLimitTitle: "HTTPS não prova identidade ou confiança",
  evidenceHttpsLimitDetail: "HTTPS protege a ligação, mas não prova a identidade ou a fiabilidade do site.",
  evidenceScopeLimitTitle: "Âmbito desta verificação",
  evidenceScopeLimitDetail:
    "Analisamos o endereço com a lista própria, marcas parecidas, DNS, acessibilidade e redirecionamentos. Não enviamos o URL a serviços de terceiros.",
  evidenceUserBlockTitle: "Lista pessoal de bloqueio",
  evidenceUserBlockDetail: "Este anfitrião está na sua lista pessoal (extensão ou app). O site não guardou a lista.",
  limitationFalsePosNeg: "Os sinais podem produzir falsos positivos ou falsos negativos.",
  limitationNoContent: "Esta verificação não analisa o conteúdo do site nem prova quem controla um domínio.",
  limitationIdentityNotSafe: "Uma correspondência de identidade não garante que todas as ações de um site sejam seguras.",
  limitationNoThirdParty:
    "URLs não são enviados a Google Safe Browsing nem a outros serviços de reputação de terceiros."
};

function formatEntries(obj) {
  return Object.entries(obj)
    .map(([k, v]) => {
      const lit = JSON.stringify(v);
      return `    ${k}: ${lit},`;
    })
    .join("\n");
}

function inject(block, entries) {
  if (block.includes("partialPackBanner:")) return block;
  return block.replace(/\n  \},(\n  "pt-PT":|\n\} as const)/, `\n${entries}\n  },$1`);
}

const msgPath = path.join(root, "i18n/messages.ts");
let src = fs.readFileSync(msgPath, "utf8");

// Split en / pt-PT roughly
const enStart = src.indexOf("  en: {");
const ptStart = src.indexOf('  "pt-PT": {');
const enBlockEnd = ptStart;
let enPart = src.slice(enStart, enBlockEnd);
let rest = src.slice(enBlockEnd);

if (!enPart.includes("partialPackBanner:")) {
  enPart = enPart.replace(
    /    feedbackMarkFp: "[^"]*"\n  \},/,
    (m) => m.replace(/\n  \},/, `,\n${formatEntries(EN)}\n  },`)
  );
  // fallback if trailing comma already
  if (!enPart.includes("partialPackBanner:")) {
    enPart = enPart.replace(/\n  \},\n$/, `\n${formatEntries(EN)}\n  },\n`);
  }
}

let ptPart = rest;
if (!ptPart.includes("partialPackBanner:")) {
  ptPart = ptPart.replace(
    /    feedbackMarkFp: "[^"]*"\n  \}\n\} as const;/,
    (m) => m.replace(/\n  \}\n\} as const;/, `,\n${formatEntries(PT)}\n  }\n} as const;`)
  );
}

src = src.slice(0, enStart) + enPart + ptPart;
fs.writeFileSync(msgPath, src);

// Refresh snapshots from runtime later; also merge into JSON snapshots
for (const [file, bag] of [
  ["_en.snapshot.json", EN],
  ["_pt-PT.snapshot.json", PT]
]) {
  const p = path.join(root, "i18n/packs", file);
  const cur = JSON.parse(fs.readFileSync(p, "utf8"));
  Object.assign(cur, bag);
  fs.writeFileSync(p, JSON.stringify(cur, null, 2) + "\n");
}

console.log("Injected risk/privacy/locale-recommend keys into messages + snapshots");
