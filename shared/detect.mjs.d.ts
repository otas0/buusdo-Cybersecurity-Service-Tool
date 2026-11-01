declare module "../shared/detect.mjs" {
  export const TRACKER_HOSTS: readonly string[];
  export type ClassifyKind = "tracker" | "phishing" | null;
  export function classifyUrl(url: string): {
    kind: ClassifyKind;
    reason: string | null;
    host: string;
    display: string;
  };
  export function sameBrandFamily(hostA: string, hostB: string): boolean;
  export function countThirdPartyTrackers(
    pageUrl: string,
    resourceUrls: Iterable<string> | string[]
  ): number;
}

export const TRACKER_HOSTS: readonly string[];
export type ClassifyKind = "tracker" | "phishing" | null;
export function classifyUrl(url: string): {
  kind: ClassifyKind;
  reason: string | null;
  host: string;
  display: string;
};
export function sameBrandFamily(hostA: string, hostB: string): boolean;
export function countThirdPartyTrackers(
  pageUrl: string,
  resourceUrls: Iterable<string> | string[]
): number;