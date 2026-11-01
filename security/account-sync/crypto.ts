import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function encKey(): Buffer {
  const raw = process.env.LISTS_ENC_KEY || process.env.AUTH_MAGIC_SECRET || "dev-lists-enc-not-for-prod";
  return createHash("sha256").update(String(raw)).digest();
}

/** Encrypt UTF-8 plaintext → base64(iv + ciphertext + tag). */
export function encryptAtRest(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptAtRest(blob: string): string {
  const buf = Buffer.from(blob, "base64");
  if (buf.length < 28) throw new Error("invalid-ciphertext");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}