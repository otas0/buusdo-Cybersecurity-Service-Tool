#!/usr/bin/env node
/**
 * Production build must flatten to Worker name buusdocst (never *-staging).
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const out = path.join(process.cwd(), "dist/server/wrangler.json");
if (!existsSync(out)) {
  console.error("FAIL: dist/server/wrangler.json missing — run vinext build first");
  process.exit(1);
}
const cfg = JSON.parse(readFileSync(out, "utf8"));
const name = String(cfg.name || "");
if (name !== "buusdocst") {
  console.error(`FAIL: production build Worker name is "${name}" (want buusdocst)`);
  process.exit(1);
}
console.log("assert-prod-wrangler-name ok — buusdocst");
