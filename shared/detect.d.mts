export const TRACKER_HOSTS: readonly string[];

export function classifyUrl(urlString: string): {
  kind: "tracker" | "phishing" | null;
  reason: string | null;
  host: string | null;
  display: string;
};

export function detectPhishingPatterns(urlString: string): {
  matched: boolean;
  reasons: string[];
};