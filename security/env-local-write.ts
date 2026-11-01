/**
 * Dev-only helpers to upsert KEY=value lines in .env.local.
 * When .env.local is denied (vinext/Sites EPERM), fall back to
 * security/data/runtime/env-overrides.env (gitignored via runtime/*).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const RUNTIME_ENV_OVERRIDES_REL = "security/data/runtime/env-overrides.env";

export type UpsertEnvResult = {
  path: string;
  line: string;
  /** True when primary .env.local write failed and runtime fallback was used. */
  usedFallback: boolean;
};

function upsertKeyInText(prev: string, key: string, line: string): string {
  if (new RegExp(`^${key}=`, "m").test(prev)) {
    let next = prev.replace(new RegExp(`^${key}=.*$`, "m"), line);
    if (!next.endsWith("\n")) next += "\n";
    return next;
  }
  return `${prev.trimEnd()}\n${line}\n`;
}

function writeEnvFile(filePath: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  let next = `${line}\n`;
  if (existsSync(filePath)) {
    next = upsertKeyInText(readFileSync(filePath, "utf8"), key, line);
  }
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, next, "utf8");
  return line;
}

/**
 * Prefer `.env.local`; on failure write `security/data/runtime/env-overrides.env`.
 * Paths are overridable for unit tests.
 */
export function upsertEnvLocalLine(
  key: string,
  value: string,
  options?: { primaryPath?: string; fallbackPath?: string; cwd?: string }
): UpsertEnvResult {
  const cwd = options?.cwd ?? process.cwd();
  const primaryPath = options?.primaryPath ?? resolve(cwd, ".env.local");
  const fallbackPath = options?.fallbackPath ?? resolve(cwd, RUNTIME_ENV_OVERRIDES_REL);
  const line = `${key}=${value}`;

  try {
    writeEnvFile(primaryPath, key, value);
    const rel =
      primaryPath === resolve(cwd, ".env.local")
        ? ".env.local"
        : primaryPath;
    return { path: rel, line, usedFallback: false };
  } catch {
    writeEnvFile(fallbackPath, key, value);
    const rel =
      fallbackPath === resolve(cwd, RUNTIME_ENV_OVERRIDES_REL)
        ? RUNTIME_ENV_OVERRIDES_REL
        : fallbackPath;
    return { path: rel, line, usedFallback: true };
  }
}