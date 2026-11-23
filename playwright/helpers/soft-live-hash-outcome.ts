/**
 * Soft-live hash in-view outcome file for CI streak reset.
 * Suite can exit green while still recording in-view soft-fails here.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type SoftLiveHashOutcome = {
  ok: boolean;
  fails: { locale: string; id: string; msg: string }[];
  oks: { locale: string; id: string }[];
};

function outcomePath() {
  return (
    process.env.SOFT_LIVE_HASH_OUTCOME_PATH ||
    path.join(process.cwd(), "ci/soft-live-hash-inview-outcome.json")
  );
}

function read(): SoftLiveHashOutcome {
  try {
    return JSON.parse(readFileSync(outcomePath(), "utf8")) as SoftLiveHashOutcome;
  } catch {
    return { ok: true, fails: [], oks: [] };
  }
}

function write(data: SoftLiveHashOutcome) {
  const out = outcomePath();
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(data, null, 2)}\n`);
}

export function softLiveHashOutcomePath() {
  return outcomePath();
}

export function softLiveHashOutcomeReset() {
  write({ ok: true, fails: [], oks: [] });
}

export function softLiveHashInViewOk(locale: string, id: string) {
  const data = read();
  data.oks.push({ locale, id });
  write(data);
}

export function softLiveHashInViewFail(locale: string, id: string, msg: string) {
  const data = read();
  data.ok = false;
  data.fails.push({ locale, id, msg });
  write(data);
}
