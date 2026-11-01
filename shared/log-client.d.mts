export const LOCAL_LOG_URL: string;

export type PrivacyMode = "off" | "local" | "share";

export function normalizePrivacyMode(value: unknown): PrivacyMode;

export function sendAnonymousLog(options: {
  privacyMode?: PrivacyMode;
  enabled?: boolean;
  source: "web" | "app";
  threatType: "tracker" | "phishing";
  timeoutMs?: number;
}): Promise<{ sent: boolean; reason?: string }>;