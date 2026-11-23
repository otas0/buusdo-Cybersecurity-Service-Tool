/**
 * Increment or reset soft-live hash green streak (extension unpark gate).
 *
 *   node scripts/bump-soft-live-hash-streak.mjs --green
 *   node scripts/bump-soft-live-hash-streak.mjs --green --from-artifact path/to/prior.json
 *   node scripts/bump-soft-live-hash-streak.mjs --reset
 *   node scripts/bump-soft-live-hash-streak.mjs --print
 *
 * Writes ci/soft-live-hash-streak.json (upload as CI artifact; do not commit bumps —
 * committed baseline stays streak=0). Sets GITHUB_OUTPUT soft_live_streak / soft_live_unpark.
 *
 * --from-artifact: merge max(prior.streak, local.streak) before --green increment
 *   (privacy-prod downloads prior soft-live-hash-streak artifact into this path).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const streakPath =
  process.env.SOFT_LIVE_HASH_STREAK_PATH ||
  path.join(root, "ci/soft-live-hash-streak.json");
const NEED = 3;

const doGreen = process.argv.includes("--green");
const doReset = process.argv.includes("--reset");
const doPrint = process.argv.includes("--print") || (!doGreen && !doReset);
const fromArtIdx = process.argv.indexOf("--from-artifact");
const fromArtifactPath =
  fromArtIdx >= 0 && process.argv[fromArtIdx + 1]
    ? path.resolve(process.argv[fromArtIdx + 1])
    : process.env.SOFT_LIVE_HASH_FROM_ARTIFACT
      ? path.resolve(process.env.SOFT_LIVE_HASH_FROM_ARTIFACT)
      : "";

function readStreakFile(p) {
  try {
    const j = JSON.parse(readFileSync(p, "utf8"));
    const n = Number(j.streak);
    return {
      streak: Number.isFinite(n) && n >= 0 ? n : 0,
      need: Number(j.need) > 0 ? Number(j.need) : NEED,
      note: j.note
    };
  } catch {
    return { streak: 0, need: NEED, note: undefined };
  }
}

function writeStreak(streak, need) {
  mkdirSync(path.dirname(streakPath), { recursive: true });
  const payload = {
    streak,
    need,
    updatedAt: new Date().toISOString(),
    note:
      "CI runtime / artifact only — committed baseline in repo stays streak=0. Extension UI parked until streak >= need."
  };
  writeFileSync(streakPath, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

let { streak, need } = readStreakFile(streakPath);

if (fromArtifactPath && existsSync(fromArtifactPath)) {
  const prior = readStreakFile(fromArtifactPath);
  streak = Math.max(streak, prior.streak);
  console.info(
    `[bump-soft-live-hash-streak] --from-artifact merged prior streak=${prior.streak} → base=${streak}`
  );
}

if (doGreen) {
  streak += 1;
  writeStreak(streak, need);
} else if (doReset) {
  streak = 0;
  writeStreak(streak, need);
}

const parked = streak < need;
const line = `[soft-live-hash] streak=${streak}/${need} extension-ui=${parked ? "parked" : "unpark"}`;
console.log(line);

const out = process.env.GITHUB_OUTPUT;
if (out) {
  try {
    writeFileSync(out, `soft_live_streak=${streak}\nsoft_live_unpark=${parked ? "false" : "true"}\n`, {
      flag: "a"
    });
  } catch {
    /* soft */
  }
}

if (doPrint && !doGreen && !doReset) {
  process.exit(0);
}
