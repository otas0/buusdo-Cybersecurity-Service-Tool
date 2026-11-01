/**
 * Sends an anonymous event to the desktop log on this computer.
 * Body is only { source, threat_type }. Runs only when privacyMode is "share".
 */

export const LOCAL_LOG_URL = "http://127.0.0.1:3000/api/log";

/** @param {unknown} value @returns {'off'|'local'|'share'} */
export function normalizePrivacyMode(value) {
  if (value === "local" || value === "share") return value;
  return "off";
}

/**
 * @param {{
 *   privacyMode?: 'off'|'local'|'share',
 *   enabled?: boolean,
 *   source: 'web'|'app',
 *   threatType: 'tracker'|'phishing',
 *   timeoutMs?: number
 * }} options
 * @returns {Promise<{ sent: boolean, reason?: string }>}
 */
export async function sendAnonymousLog(options) {
  try {
    const mode = normalizePrivacyMode(
      options?.privacyMode ?? (options?.enabled ? "share" : "off")
    );
    const source = options && options.source;
    const threatType = options && options.threatType;
    const timeoutMs = (options && options.timeoutMs) || 2500;

    if (mode !== "share") return { sent: false, reason: mode === "local" ? "local-only" : "disabled" };
    if (source !== "web" && source !== "app") return { sent: false, reason: "bad-source" };
    if (threatType !== "tracker" && threatType !== "phishing") {
      return { sent: false, reason: "bad-type" };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(LOCAL_LOG_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, threat_type: threatType }),
        signal: controller.signal
      });
      if (!response.ok) return { sent: false, reason: "http" };
      return { sent: true };
    } catch (err) {
      console.debug("[shield] local log unreachable:", err && err.message ? err.message : err);
      return { sent: false, reason: "unreachable" };
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    console.debug("[shield] local log error ignored:", err && err.message ? err.message : err);
    return { sent: false, reason: "error" };
  }
}