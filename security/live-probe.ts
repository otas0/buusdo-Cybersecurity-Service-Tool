import { lookup } from "node:dns/promises";
import { getRegistrableDomain } from "./url";
import type { LiveProbe } from "./site-signals";
/** Re-export probe-blocked copy (403 refuse / 429 throttle / 503 overload) for probe-facing callers. */
export { ambiguousProbeBlockedCopy } from "./probe-blocked-copy";
import { getConfiguredProbeTimeoutMs } from "./probe-budget";
import { rememberHeadFail } from "./probe-head-skip";

export type ProbeUrlOptions = {
  /** Skip HEAD and use GET on the first hop (known HEAD-hostile hosts). */
  skipHead?: boolean;
};

const MAX_REDIRECTS = 5;

function hopTimeoutMs() {
  return getConfiguredProbeTimeoutMs();
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function registrableOfUrl(urlString: string): string | null {
  try {
    return getRegistrableDomain(new URL(urlString).hostname);
  } catch {
    return null;
  }
}

async function resolveHost(host: string): Promise<string[]> {
  try {
    const records = await withTimeout(lookup(host, { all: true }), 2000);
    return records.map((item) => item.address).filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchHop(url: string, method: "HEAD" | "GET"): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), hopTimeoutMs());
  try {
    return await fetch(url, {
      method,
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "PreventiveShield/1.0 (+site-check)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8"
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Live network probe for any http(s) address.
 * Fast-fail: short per-hop timeout, HEAD first (unless skipHead), then GET if needed.
 * Does not store page bodies or credentials.
 */
export async function probeUrl(urlString: string, options: ProbeUrlOptions = {}): Promise<LiveProbe> {
  const empty: LiveProbe = {
    resolved: false,
    addresses: [],
    reachable: false,
    statusCode: null,
    finalUrl: null,
    redirectChain: [],
    redirected: false,
    crossDomainRedirect: false,
    tlsOk: null,
    error: null,
    timedOut: false,
    probeHeadFailed: false
  };

  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { ...empty, error: "invalid-url" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ...empty, error: "unsupported-protocol" };
  }

  const host = url.hostname;
  const addresses = await resolveHost(host);
  const startDomain = getRegistrableDomain(host);
  let current = url.toString();
  const redirectChain: string[] = [current];
  let redirected = false;
  let crossDomainRedirect = false;
  let statusCode: number | null = null;
  let finalUrl: string | null = null;
  const tlsOk: boolean | null = url.protocol === "https:" ? true : null;
  let probeHeadFailed = false;
  const skipHead = Boolean(options.skipHead);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      let response: Response;
      if (hop === 0 && skipHead) {
        probeHeadFailed = true;
        response = await fetchHop(current, "GET");
      } else {
        try {
          response = await fetchHop(current, "HEAD");
          // Some hosts reject HEAD — fall back once to GET.
          if (response.status === 405 || response.status === 501) {
            if (hop === 0) probeHeadFailed = true;
            response = await fetchHop(current, "GET");
          }
        } catch (headErr) {
          if (hop === 0) {
            probeHeadFailed = true;
            response = await fetchHop(current, "GET");
          } else {
            throw headErr;
          }
        }
      }

      statusCode = response.status;
      finalUrl = current;

      try {
        if (response.body) await response.arrayBuffer();
      } catch {
        /* ignore */
      }

      const location = response.headers.get("location");
      if (location && statusCode >= 300 && statusCode < 400) {
        const next = new URL(location, current).toString();
        const nextDomain = registrableOfUrl(next);
        redirected = true;
        if (nextDomain && startDomain && nextDomain !== startDomain) {
          crossDomainRedirect = true;
        }
        current = next;
        redirectChain.push(next);
        if (hop === MAX_REDIRECTS) break;
        continue;
      }
      break;
    }

    if (probeHeadFailed && !skipHead) rememberHeadFail(startDomain);

    return {
      resolved: true,
      addresses,
      reachable: true,
      statusCode,
      finalUrl,
      redirectChain,
      redirected,
      crossDomainRedirect,
      tlsOk,
      error: null,
      timedOut: false,
      probeHeadFailed
    };
  } catch (err) {
    const message = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "fetch-fail";
    const name = err && typeof err === "object" && "name" in err ? String((err as { name: string }).name) : "";
    const code = err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : "";
    const timedOut = name === "AbortError" || code === "ETIMEDOUT" || /aborted|timeout/i.test(message);
    const tlsProblem = /certificate|SSL|TLS|CERT/i.test(message) || code.startsWith("CERT_");

    if (probeHeadFailed && !skipHead) rememberHeadFail(startDomain);

    return {
      resolved: addresses.length > 0 || !timedOut,
      addresses,
      reachable: false,
      statusCode: null,
      finalUrl: redirectChain[redirectChain.length - 1] || null,
      redirectChain,
      redirected,
      crossDomainRedirect,
      tlsOk: tlsProblem ? false : null,
      error: timedOut ? "timeout" : tlsProblem ? "tls" : addresses.length ? code || message.slice(0, 80) : "unreachable",
      timedOut,
      probeHeadFailed
    };
  }
}