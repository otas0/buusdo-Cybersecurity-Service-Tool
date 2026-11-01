export type ShieldListEntry = { domain: string; reason?: string; addedAt?: string };

export type ShieldListsBackup = {
  schema: string;
  updatedAt: string;
  blocked: ShieldListEntry[];
  trusted: ShieldListEntry[];
};

export function parseBackup(raw: unknown): ShieldListsBackup;
export function mergeBackups(a: unknown, b: unknown): ShieldListsBackup;
export function serializeBackup(lists: unknown): string;
export function normalizeListHost(raw: string): string;