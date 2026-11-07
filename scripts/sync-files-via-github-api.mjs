#!/usr/bin/env node
/**
 * Upload listed paths (or git status paths) to origin/main via Contents API.
 *
 *   node scripts/sync-files-via-github-api.mjs path1 path2 …
 *   SYNC_MODE=status node scripts/sync-files-via-github-api.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import { relative } from "node:path";

const owner = process.env.OWNER || "otas0";
const repo = process.env.REPO || "buusdocst";
const branch = process.env.BRANCH || "main";
const token = execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();

const api = async (path, { method = "GET", body } = {}) => {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok && res.status !== 404) {
    const err = new Error(`API ${method} ${path} → ${res.status}`);
    err.detail = json;
    throw err;
  }
  return { status: res.status, json };
};

let paths = process.argv.slice(2);
if (process.env.SYNC_MODE === "status" || paths[0] === "--status") {
  const out = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" });
  paths = out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[MADRCU?!]{1,2}\s+/, "").replace(/^.* -> /, ""))
    .filter((p) => p && !p.endsWith("/"));
}

const skip = new Set([
  ".env",
  ".env.local",
  "node_modules",
  ".cursor/hooks.json"
]);

paths = [...new Set(paths)].filter((p) => {
  if (!p || skip.has(p) || p.startsWith(".cursor/")) return false;
  if (!existsSync(p)) return false;
  if (statSync(p).isDirectory()) return false;
  // skip huge binaries
  if (statSync(p).size > 900_000) {
    console.warn("skip large", p);
    return false;
  }
  return true;
});

console.info(`syncing ${paths.length} files to ${owner}/${repo}@${branch}`);

for (const filePath of paths) {
  const content = readFileSync(filePath);
  const b64 = content.toString("base64");
  const { status, json: existing } = await api(
    `/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`
  );
  const body = {
    message: `chore: sync ${filePath}`,
    content: b64,
    branch
  };
  if (status === 200 && existing.sha) body.sha = existing.sha;
  const { status: putStatus, json } = await api(
    `/repos/${owner}/${repo}/contents/${filePath}`,
    { method: "PUT", body }
  );
  if (putStatus >= 400) {
    console.error("FAIL", filePath, putStatus, json);
    process.exitCode = 1;
    continue;
  }
  console.info("OK", filePath, json.commit?.sha?.slice(0, 7));
}