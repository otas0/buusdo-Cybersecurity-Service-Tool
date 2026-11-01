/**
 * Working address checks for Preventive Shield.
 * Tracker hosts are third-party ad / analytics domains.
 * Phishing checks compare a host with the real domain of a named organisation.
 * The returned display is host + path only. Query strings are never kept.
 */

const TRACKER_HOSTS = [
  "google-analytics.com",
  "googletagmanager.com",
  "doubleclick.net",
  "googleadservices.com",
  "googlesyndication.com",
  "facebook.net",
  "scorecardresearch.com",
  "quantserve.com",
  "adnxs.com",
  "adsrvr.org",
  "criteo.com",
  "criteo.net",
  "taboola.com",
  "outbrain.com",
  "hotjar.com",
  "mouseflow.com",
  "fullstory.com",
  "mixpanel.com",
  "api.segment.io",
  "cdn.segment.com",
  "nr-data.net",
  "chartbeat.com",
  "chartbeat.net",
  "demdex.net",
  "omtrdc.net",
  "everesttech.net",
  "mathtag.com",
  "casalemedia.com",
  "rubiconproject.com",
  "pubmatic.com",
  "openx.net",
  "amazon-adsystem.com",
  "ads.twitter.com",
  "analytics.twitter.com",
  "static.ads-twitter.com",
  "ads.linkedin.com",
  "px.ads.linkedin.com",
  "bat.bing.com",
  "clarity.ms",
  "ads.apple.com",
  "iadsdk.apple.com",
  "metrics.apple.com",
  "securemetrics.apple.com",
  "metrics.icloud.com",
  "sc-static.net",
  "snapads.com"
];

/** token must equal a host label. domains are the real sites for that name. */
const BRANDS = [
  { token: "paypal", domains: ["paypal.com", "paypalobjects.com"] },
  { token: "mbway", domains: ["mbway.pt", "sibs.pt"] },
  { token: "millenniumbcp", domains: ["millenniumbcp.pt"] },
  { token: "novobanco", domains: ["novobanco.pt"] },
  { token: "santander", domains: ["santander.pt", "santander.com", "santanderconsumer.com", "santanderconsumer.pt"] },
  { token: "apple", domains: ["apple.com", "icloud.com", "ads.apple.com", "iadsdk.apple.com", "metrics.apple.com", "securemetrics.apple.com", "metrics.icloud.com"] },
  { token: "icloud", domains: ["icloud.com", "apple.com", "metrics.icloud.com"] },
  { token: "microsoft", domains: ["microsoft.com", "microsoftonline.com", "office.com", "office365.com", "live.com", "outlook.com", "windows.com", "msn.com", "bing.com", "bat.bing.com", "clarity.ms"] },
  { token: "outlook", domains: ["outlook.com", "office.com", "microsoft.com", "live.com"] },
  { token: "adobe", domains: ["adobe.com", "adobelogin.com", "demdex.net", "omtrdc.net", "everesttech.net"] },
  { token: "amazon", domains: ["amazon.com", "amazon.es", "amazon.co.uk", "amazonaws.com", "media-amazon.com", "ssl-images-amazon.com", "amazon-adsystem.com", "assoc-amazon.com", "advertising.amazon.com"] },
  { token: "google", domains: ["google.com", "google.pt", "google.es", "gmail.com", "youtube.com", "youtu.be", "gstatic.com", "googleapis.com", "googleusercontent.com", "ggpht.com", "withgoogle.com", "google-analytics.com", "googletagmanager.com", "doubleclick.net"] },
  { token: "gmail", domains: ["gmail.com", "google.com"] },
  { token: "facebook", domains: ["facebook.com", "fb.com", "facebook.net", "meta.com", "instagram.com"] },
  { token: "instagram", domains: ["instagram.com", "facebook.com", "cdninstagram.com"] },
  { token: "linkedin", domains: ["linkedin.com", "ads.linkedin.com", "px.ads.linkedin.com", "licdn.com"] },
  { token: "twitter", domains: ["twitter.com", "x.com", "t.co", "twimg.com", "ads.twitter.com", "analytics.twitter.com", "static.ads-twitter.com"] },
  { token: "x", domains: ["x.com", "twitter.com", "t.co", "twimg.com", "ads.twitter.com", "analytics.twitter.com", "static.ads-twitter.com"] },
  { token: "snapchat", domains: ["snapchat.com", "snap.com", "sc-static.net", "snapads.com"] },
  { token: "netflix", domains: ["netflix.com", "nflxvideo.net", "nflximg.net"] },
  { token: "cgd", domains: ["cgd.pt"] },
  { token: "caixa", domains: ["cgd.pt"] },
  { token: "worten", domains: ["worten.pt", "worten.net"] },
  { token: "continente", domains: ["continente.pt", "sonae.pt"] },
  { token: "ctt", domains: ["ctt.pt"] }
];

const SENSITIVE_PATH = /\/(login|signin|sign-in|verify|account|accounts|password|banking)\b/i;
const SECRET_QUERY = /(?:^|[?&])(?:password|passwd|pwd)=/i;

function empty(display) {
  return { kind: null, reason: null, host: null, display: display || "" };
}

function hostIs(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

function labelsOf(host) {
  const labels = [];
  for (const part of host.split(".")) {
    for (const piece of part.split("-")) {
      if (piece) labels.push(piece);
    }
  }
  return labels;
}

function isTracker(host) {
  return TRACKER_HOSTS.some((domain) => hostIs(host, domain));
}

function isOfficial(host) {
  for (const brand of BRANDS) {
    if (brand.domains.some((domain) => hostIs(host, domain))) return true;
  }
  return false;
}

function sameBrandFamily(hostA, hostB) {
  const a = String(hostA || "").toLowerCase().replace(/\.$/, "");
  const b = String(hostB || "").toLowerCase().replace(/\.$/, "");
  if (!a || !b) return false;
  for (const brand of BRANDS) {
    const inA = brand.domains.some((domain) => hostIs(a, domain));
    const inB = brand.domains.some((domain) => hostIs(b, domain));
    if (inA && inB) return true;
  }
  return false;
}

function matchedBrand(host) {
  const labels = new Set(labelsOf(host));
  for (const brand of BRANDS) {
    if (!labels.has(brand.token)) continue;
    if (brand.domains.some((domain) => hostIs(host, domain))) continue;
    return brand.token;
  }
  return null;
}

/**
 * @param {string} urlString
 * @returns {{ kind: 'tracker'|'phishing'|null, reason: string|null, host: string|null, display: string }}
 */
function classifyUrl(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    try {
      url = new URL(`http://${urlString}`);
    } catch {
      return empty(String(urlString || ""));
    }
  }

  if (
    url.protocol === "chrome:" ||
    url.protocol === "chrome-extension:" ||
    url.protocol === "about:" ||
    url.protocol === "devtools:"
  ) {
    return empty("");
  }

  const host = (url.hostname || "").toLowerCase().replace(/\.$/, "");
  const display = `${host}${url.pathname || ""}`;
  if (!host || host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return empty(display);
  }

  if (url.username || url.password) {
    return { kind: "phishing", reason: "userinfo", host, display };
  }

  if (SECRET_QUERY.test(url.search || "")) {
    return { kind: "phishing", reason: "query-secret", host, display };
  }

  if (isTracker(host)) {
    return { kind: "tracker", reason: `tracker:${host}`, host, display };
  }

  const brand = matchedBrand(host);
  if (brand) {
    return { kind: "phishing", reason: `brand:${brand}`, host, display };
  }

  if (host.includes("xn--") && SENSITIVE_PATH.test(url.pathname || "")) {
    return { kind: "phishing", reason: "punycode-login", host, display };
  }

  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) && SENSITIVE_PATH.test(url.pathname || "")) {
    return { kind: "phishing", reason: "ip-login", host, display };
  }

  return { kind: null, reason: null, host, display };
}

/**
 * @param {string} urlString
 * @returns {{ matched: boolean, reasons: string[] }}
 */
function detectPhishingPatterns(urlString) {
  const result = classifyUrl(urlString);
  if (result.kind !== "phishing" || !result.reason) return { matched: false, reasons: [] };
  return { matched: true, reasons: [result.reason] };
}

/** Same-brand stay-0: youtube.com+doubleclick.net; snapchat.com+sc-static.net (+hotjar → 1). */
function countThirdPartyTrackers(pageUrl, resourceUrls) {
  let pageHost = "";
  try {
    pageHost = new URL(pageUrl).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return 0;
  }
  let count = 0;
  for (const raw of resourceUrls || []) {
    const classified = classifyUrl(raw);
    if (classified.kind !== "tracker" || !classified.host) continue;
    if (sameBrandFamily(pageHost, classified.host)) continue;
    count += 1;
  }
  return count;
}

globalThis.ShieldDetect = {
  TRACKER_HOSTS,
  classifyUrl,
  detectPhishingPatterns,
  sameBrandFamily,
  countThirdPartyTrackers
};