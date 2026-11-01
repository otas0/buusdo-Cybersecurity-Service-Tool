/**
 * v2 client-side E2E encryption for shield-lists-v1 blobs.
 * Server stores the envelope opaque (still may wrap with at-rest encryption).
 *
 * Envelope schema: shield-lists-e2e-v2
 * { schema, salt, iv, ciphertext, updatedAt? }
 *
 * Passphrase never leaves the client. Uses Web Crypto when available, else node:crypto.
 */

export const E2E_SCHEMA = "shield-lists-e2e-v2";

function getSubtle() {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  return null;
}

async function deriveKey(passphrase, saltBytes) {
  const subtle = getSubtle();
  if (subtle) {
    const enc = new TextEncoder();
    const base = await subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, [
      "deriveKey"
    ]);
    return subtle.deriveKey(
      { name: "PBKDF2", salt: saltBytes, iterations: 210_000, hash: "SHA-256" },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }
  const { createHash, pbkdf2Sync } = await import("node:crypto");
  const keyBytes = pbkdf2Sync(passphrase, Buffer.from(saltBytes), 210_000, 32, "sha256");
  // node path uses createCipheriv below — return raw bytes marker
  return { __nodeKey: keyBytes, __hash: createHash };
}

function randomBytes(n) {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
    const buf = new Uint8Array(n);
    globalThis.crypto.getRandomValues(buf);
    return buf;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { randomBytes: rb } = require("node:crypto");
  return new Uint8Array(rb(n));
}

function b64(u8) {
  if (typeof Buffer !== "undefined") return Buffer.from(u8).toString("base64");
  let s = "";
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(str) {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(str, "base64"));
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * @param {unknown} backup shield-lists-v1 object
 * @param {string} passphrase
 */
export async function encryptListsE2E(backup, passphrase) {
  if (!passphrase || passphrase.length < 8) throw new Error("passphrase-too-short");
  const plaintext = new TextEncoder().encode(JSON.stringify(backup));
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const subtle = getSubtle();
  if (subtle) {
    const key = await deriveKey(passphrase, salt);
    const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
    return {
      schema: E2E_SCHEMA,
      salt: b64(salt),
      iv: b64(iv),
      ciphertext: b64(ct),
      updatedAt:
        backup && typeof backup === "object" && typeof backup.updatedAt === "string"
          ? backup.updatedAt
          : new Date().toISOString()
    };
  }
  const { createCipheriv, pbkdf2Sync } = await import("node:crypto");
  const keyBytes = pbkdf2Sync(passphrase, Buffer.from(salt), 210_000, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", keyBytes, Buffer.from(iv));
  const enc = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    schema: E2E_SCHEMA,
    salt: b64(salt),
    iv: b64(iv),
    ciphertext: b64(Buffer.concat([enc, tag])),
    updatedAt:
      backup && typeof backup === "object" && typeof backup.updatedAt === "string"
        ? backup.updatedAt
        : new Date().toISOString()
  };
}

/**
 * @param {unknown} envelope
 * @param {string} passphrase
 */
export async function decryptListsE2E(envelope, passphrase) {
  if (!envelope || typeof envelope !== "object") throw new Error("invalid-envelope");
  if (envelope.schema !== E2E_SCHEMA) throw new Error(`unsupported-schema:${envelope.schema}`);
  const salt = unb64(String(envelope.salt || ""));
  const iv = unb64(String(envelope.iv || ""));
  const raw = unb64(String(envelope.ciphertext || ""));
  const subtle = getSubtle();
  if (subtle) {
    const key = await deriveKey(passphrase, salt);
    const pt = await subtle.decrypt({ name: "AES-GCM", iv }, key, raw);
    return JSON.parse(new TextDecoder().decode(pt));
  }
  const { createDecipheriv, pbkdf2Sync } = await import("node:crypto");
  const keyBytes = pbkdf2Sync(passphrase, Buffer.from(salt), 210_000, 32, "sha256");
  const data = Buffer.from(raw);
  if (data.length < 16) throw new Error("invalid-ciphertext");
  const tag = data.subarray(data.length - 16);
  const enc = data.subarray(0, data.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", keyBytes, Buffer.from(iv));
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(enc), decipher.final()]);
  return JSON.parse(pt.toString("utf8"));
}

export function isE2EEnvelope(raw) {
  return Boolean(raw && typeof raw === "object" && raw.schema === E2E_SCHEMA);
}