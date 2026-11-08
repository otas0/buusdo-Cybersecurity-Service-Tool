#!/usr/bin/env node
/**
 * Refresh the latest successful Deploy Cloudflare run URL in LOCAL_CF_CONNECTIVITY.md.
 *
 *   gh auth status   # required
 *   npm run sync:latest-deploy-run-url
 *
 * Soft by default: gh failures print ::warning:: and exit 0 (does not block CI).
 * Set SYNC_DEPLOY_RUN_URL_STRICT=1 to exit 1 on failure.
 *
 * Env:
 *   GITHUB_REPOSITORY — owner/repo (default: otas0/buusdo-Cybersecurity-Service-Tool)
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const docPath = path.join(root, "docs/LOCAL_CF_CONNECTIVITY.md");
const repo = process.env.GITHUB_REPOSITORY || "otas0/buusdo-Cybersecurity-Service-Tool";
const strict = process.env.SYNC_DEPLOY_RUN_URL_STRICT === "1";

function softFail(msg) {
  console.warn(`::warning::[sync-latest-deploy-run-url] ${msg}`);
  console.warn(`[sync-latest-deploy-run-url] soft-fail — doc unchanged`);
  process.exit(strict ? 1 : 0);
}

function ghJson(args) {
  const out = execFileSync("gh", args, {
    encoding: "utf8",
    maxBuffer: 2_000_000,
    env: process.env
  });
  return JSON.parse(out);
}

let run;
try {
  const rows = ghJson([
    "run",
    "list",
    "--repo",
    repo,
    "--workflow",
    "Deploy Cloudflare",
    "--status",
    "success",
    "--limit",
    "1",
    "--json",
    "databaseId,url,displayTitle,createdAt,conclusion"
  ]);
  run = rows?.[0];
} catch (err) {
  softFail(`gh failed: ${err?.message || err}`);
}

if (!run?.url || !run?.databaseId) {
  softFail("no successful Deploy Cloudflare run found");
}

const link = `[run ${run.databaseId}](${run.url})`;
let md = fs.readFileSync(docPath, "utf8");
const markerRe =
  /e\.g\. \[run \d+\]\(https:\/\/github\.com\/[^)]+\/actions\/runs\/\d+\)/;
const stamp = `<!-- latest-deploy-run: ${run.databaseId} ${run.createdAt || ""} -->`;

if (markerRe.test(md)) {
  md = md.replace(markerRe, `e.g. ${link}`);
} else {
  md = md.replace(
    /(## What happened \(2026-11-08\)[^\n]*\n)/,
    `$1\nLatest successful Deploy (auto): ${link}.\n`
  );
}

if (md.includes("<!-- latest-deploy-run:")) {
  md = md.replace(/<!-- latest-deploy-run:[^>]*-->/, stamp);
} else {
  md = `${stamp}\n${md}`;
}

fs.writeFileSync(docPath, md);
console.log(`[sync-latest-deploy-run-url] wrote ${link} → docs/LOCAL_CF_CONNECTIVITY.md`);
console.log(`::notice::latest Deploy success ${run.databaseId} ${run.url}`);
