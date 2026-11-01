export type AccountClient = "web" | "extension" | "desktop";

export type AccountUser = {
  id: string;
  email: string;
  createdAt: string;
};

export type AccountSession = {
  id: string;
  userId: string;
  tokenHash: string;
  kind: "cookie" | "bearer" | "refresh";
  expiresAt: string;
  createdAt: string;
};

export type MagicChallenge = {
  tokenHash: string;
  email: string;
  client: AccountClient;
  expiresAt: string;
  createdAt: string;
};

export type DeviceCode = {
  codeHash: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
};

export type StoreFile = {
  users: AccountUser[];
  sessions: AccountSession[];
  magics: MagicChallenge[];
  deviceCodes: DeviceCode[];
  /** userId → encrypted shield-lists-v1 JSON (or e2e envelope JSON) */
  listBlobs: Record<string, { ciphertext: string; updatedAt: string }>;
};

export const EMPTY_STORE: StoreFile = {
  users: [],
  sessions: [],
  magics: [],
  deviceCodes: [],
  listBlobs: {}
};