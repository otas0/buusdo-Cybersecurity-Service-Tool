#!/usr/bin/env node
/**
 * Push local HEAD onto origin/main via GitHub Git Data API when github.com git HTTPS is unreachable.
 *
 *   OWNER=otas0 REPO=preventive-cybersecurity-prototype node scripts/push-via-github-api.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const owner = process.env.OWNER || "otas0";
const repo = process.env.REPO || "preventive-cybersecurity-prototype";
const branch = process.env.BRANCH || "main";
const token = execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
if (!token) {
  console.error("gh auth token empty");
  process.exit(1);
}

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
  if (!res.ok) {
    const err = new Error(`API ${method} ${path} → ${res.status}`);
    err.detail = json;
    throw err;
  }
  return json;
};

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8" }).trim();

const localHead = sh("git", ["rev-parse", "HEAD"]);
const remoteRef = await api(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
const remoteSha = remoteRef.object.sha;
const remoteCommit = await api(`/repos/${owner}/${repo}/git/commits/${remoteSha}`);
const baseTreeSha = remoteCommit.tree.sha;

console.info(`local HEAD=${localHead}`);
console.info(`remote ${branch}=${remoteSha}`);
console.info(`base_tree=${baseTreeSha}`);

// Remote tip may not exist locally (API-only smoke commit). Diff against the known
 // shared ancestor that remote's parent points at (pre-smoke main).
const sharedAncestor =
  process.env.SHARED_ANCESTOR || "98b0f44351fd6c6cbcd6547d552f6226568413a0";
const paths = sh("git", ["diff", "--name-only", sharedAncestor, "HEAD"])
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);

console.info(`uploading ${paths.length} paths…`);

const treeItems = [];
let i = 0;
for (const path of paths) {
  i += 1;
  let content;
  try {
    content = sh("git", ["show", `HEAD:${path}`]);
  } catch {
    console.warn(`skip missing at HEAD: ${path}`);
    continue;
  }
  const blob = await api(`/repos/${owner}/${repo}/git/blobs`, {
    method: "POST",
    body: {
      content: Buffer.from(content, "utf8").toString("base64"),
      encoding: "base64"
    }
  });
  treeItems.push({
    path,
    mode: "100644",
    type: "blob",
    sha: blob.sha
  });
  if (i % 25 === 0) console.info(`  ${i}/${paths.length}`);
}

const tree = await api(`/repos/${owner}/${repo}/git/trees`, {
  method: "POST",
  body: {
    base_tree: baseTreeSha,
    tree: treeItems
  }
});

const commit = await api(`/repos/${owner}/${repo}/git/commits`, {
  method: "POST",
  body: {
    message:
      "Ship Cloudflare Workers launch path onto main (API sync; github.com git HTTPS blocked locally).\n\nIncludes health-monitor check:prod + production origin pcpd.",
    tree: tree.sha,
    parents: [remoteSha]
  }
});

await api(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
  method: "PATCH",
  body: { sha: commit.sha, force: false }
});

console.info(`OK pushed commit ${commit.sha}`);
console.info(`https://github.com/${owner}/${repo}/commit/${commit.sha}`);
