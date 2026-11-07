#!/usr/bin/env node
/**
 * After CLOUDFLARE_ENV=staging vinext/vite build, the flattened
 * dist/server/wrangler.json must name the Worker buusdocst-staging.
 * Prevents staging deploy from overwriting production buusdocst.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "dist/server/wrangler.json");
if (!existsSync(out)) {
  console.error(
    "FAIL: dist/server/wrangler.json missing — run CLOUDFLARE_ENV=staging vinext build first"
  );
  process.exit(1);
}

const cfg = JSON.parse(readFileSync(out, "utf8"));
const name = String(cfg.name || "");
if (name !== "buusdocst-staging") {
  console.error(
    `FAIL: staging build Worker name is "${name}" (want buusdocst-staging). ` +
      "Set CLOUDFLARE_ENV=staging for the build; do not rely on wrangler deploy --env alone."
  );
  process.exit(1);
}

console.log("assert-staging-wrangler-name ok — buusdocst-staging");
