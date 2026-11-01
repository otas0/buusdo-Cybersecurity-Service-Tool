/**
 * Local anonymous log. Each line is { at, source, threat_type } only.
 * Written only when privacyMode is "share". Default mode is "off".
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_FILE = path.join(__dirname, "..", "data", "shield-log.jsonl");

/** @param {unknown} value @returns {'off'|'local'|'share'} */
function normalizePrivacyMode(value) {
  if (value === "local" || value === "share") return value;
  return "off";
}

function acceptAnonymousEvent(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const keys = Object.keys(body);
  if (keys.length !== 2 || !keys.includes("source") || !keys.includes("threat_type")) return null;
  if (body.source !== "web" && body.source !== "app") return null;
  if (body.threat_type !== "tracker" && body.threat_type !== "phishing") return null;
  return { source: body.source, threat_type: body.threat_type };
}

function appendAnonymous(body, file = process.env.SHIELD_LOG_FILE || DEFAULT_FILE) {
  const accepted = acceptAnonymousEvent(body);
  if (!accepted) return { sent: false, reason: "rejected" };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const line = JSON.stringify({ at: new Date().toISOString(), ...accepted }) + "\n";
  fs.appendFileSync(file, line);
  return { sent: true };
}

/**
 * @param {'off'|'local'|'share'|(() => string)} modeOrFn
 * @param {'tracker'|'phishing'} threatType
 */
function recordIfEnabled(modeOrFn, threatType) {
  try {
    const raw = typeof modeOrFn === "function" ? modeOrFn() : modeOrFn;
    const mode = normalizePrivacyMode(raw);
    if (mode !== "share") return { sent: false, reason: mode === "local" ? "local-only" : "disabled" };
    return appendAnonymous({ source: "app", threat_type: threatType });
  } catch (err) {
    console.debug("[desktop] local log error ignored:", err && err.message ? err.message : err);
    return { sent: false, reason: "error" };
  }
}

module.exports = {
  normalizePrivacyMode,
  acceptAnonymousEvent,
  appendAnonymous,
  recordIfEnabled,
  DEFAULT_FILE
};