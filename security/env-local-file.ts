/**
 * Node-only env file reads. Do not import from client components —
 * Vite will externalize node:fs and break the browser bundle.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RUNTIME_ENV_OVERRIDES_REL } from "./env-local-write";

function readKeyFromFile(filePath: string, key: string): string | null {
  try {
    if (!existsSync(filePath)) return null;
    const text = readFileSync(filePath, "utf8");
    const match = text.match(new RegExp(`^${key}=(.*)$`, "m"));
    if (!match) return null;
    return match[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    return null;
  }
}

/**
 * Read a single KEY=value: `.env.local` first, then runtime fallback
 * (`security/data/runtime/env-overrides.env`).
 */
export function readEnvLocalValue(key: string, cwd = process.cwd()): string | null {
  const fromDotEnv = readKeyFromFile(resolve(cwd, ".env.local"), key);
  if (fromDotEnv != null) return fromDotEnv;
  return readKeyFromFile(resolve(cwd, RUNTIME_ENV_OVERRIDES_REL), key);
}