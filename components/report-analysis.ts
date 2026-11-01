"use client";

import { sendAnonymousLog, normalizePrivacyMode } from "../shared/log-client.mjs";
import type { Analysis } from "../security/analyse";

export const PRIVACY_KEY = "shieldPrivacyMode";
export type PrivacyMode = "off" | "local" | "share";

export function getPrivacyMode(): PrivacyMode {
  try {
    return normalizePrivacyMode(localStorage.getItem(PRIVACY_KEY));
  } catch {
    return "off";
  }
}

export function setPrivacyMode(mode: PrivacyMode) {
  localStorage.setItem(PRIVACY_KEY, normalizePrivacyMode(mode));
}

/** Phishing-level results may be counted. The address itself is never sent. */
export function phishingSignal(analysis: Pick<Analysis, "risk" | "threat">) {
  return (
    analysis.risk.level === "CRITICAL" ||
    analysis.risk.level === "HIGH" ||
    analysis.threat.state === "KNOWN_PHISHING" ||
    analysis.threat.state === "KNOWN_MALICIOUS"
  );
}

export async function reportAnalysis(analysis: Pick<Analysis, "risk" | "threat">) {
  if (!phishingSignal(analysis)) return;
  const mode = getPrivacyMode();
  if (mode === "off") return;

  const entry = { at: new Date().toISOString(), source: "web", threat_type: "phishing" };
  try {
    const prev = JSON.parse(localStorage.getItem("shieldAnonymousLog") || "[]");
    const next = [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, 200);
    localStorage.setItem("shieldAnonymousLog", JSON.stringify(next));
  } catch {
    /* storage can be blocked; the check itself still completes */
  }

  if (mode === "share") {
    await sendAnonymousLog({ privacyMode: "share", source: "web", threatType: "phishing" });
  }
}