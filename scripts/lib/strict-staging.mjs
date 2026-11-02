/**
 * Staging smoke skip policy.
 * Default: exit 0 with SKIP message when STAGING_HEALTH_URL unset.
 * STRICT_STAGING=1: exit 1 instead (CI / ops hard gate).
 */
export function stagingUrlOrExit(label = "staging-smoke") {
  const staging = String(process.env.STAGING_HEALTH_URL || process.env.STAGING_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  const prod = String(process.env.PRODUCTION_HEALTH_URL || "https://pcpd.mtsu.workers.dev")
    .trim()
    .replace(/\/$/, "");
  const strict = process.env.STRICT_STAGING === "1";

  if (!staging) {
    const msg = `${label} SKIP — set STAGING_HEALTH_URL (gate pending)`;
    if (strict) {
      console.error(`STRICT_STAGING=1: ${msg}`);
      process.exit(1);
    }
    console.log(msg);
    process.exit(0);
  }
  if (staging === prod) {
    console.error("REFUSE: STAGING_HEALTH_URL must not equal production");
    process.exit(1);
  }
  return { staging, prod, strict };
}

export function stagingSoftSkip(label, reason) {
  const strict = process.env.STRICT_STAGING === "1";
  const msg = `${label} SKIP — ${reason}`;
  if (strict) {
    console.error(`STRICT_STAGING=1: ${msg}`);
    process.exit(1);
  }
  console.log(msg);
  process.exit(0);
}
