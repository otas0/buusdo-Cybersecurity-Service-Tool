#!/usr/bin/env node
/**
 * Preview build must flatten to Worker name buusdocst-preview.
 *
 *   CLOUDFLARE_ENV=preview vinext build
 *   node scripts/assert-preview-wrangler-name.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const out = path.join(process.cwd(), "dist/server/wrangler.json");
if (!existsSync(out)) {
  console.error("FAIL: dist/server/wrangler.json missing — run CLOUDFLARE_ENV=preview vinext build first");
  process.exit(1);
}
const cfg = JSON.parse(readFileSync(out, "utf8"));
const name = String(cfg.name || "");
if (name !== "buusdocst-preview") {
  console.error(`FAIL: preview build Worker name is "${name}" (want buusdocst-preview)`);
  process.exit(1);
}
console.log("assert-preview-wrangler-name ok — buusdocst-preview");
