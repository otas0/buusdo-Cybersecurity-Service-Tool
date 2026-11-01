/**
 * Ops counters for POST /api/check timing-schema-invalid failures.
 * Fixed keys only — never URL / host / payload.
 *
 * Optional GET /api/health echo when CHECK_TIMING_SCHEMA_FAIL_HEALTH=1.
 */

export const TIMING_SCHEMA_FAIL_HEALTH_ENV = "CHECK_TIMING_SCHEMA_FAIL_HEALTH";

export type TimingSchemaFailCounters = {
  /** CheckTiming missing ambiguousProbeStatus (mid-migration / old client). */
  ambiguousAbsent: number;
  /** Field present but schema still failed (wrong type or other required fields). */
  ambiguousBoolean: number;
};

const counters: TimingSchemaFailCounters = {
  ambiguousAbsent: 0,
  ambiguousBoolean: 0
};

export function recordTimingSchemaFail(ambiguousProbeStatus: unknown): TimingSchemaFailCounters {
  if (ambiguousProbeStatus === "absent") counters.ambiguousAbsent += 1;
  else counters.ambiguousBoolean += 1;
  return { ...counters };
}

export function getTimingSchemaFailCounters(): TimingSchemaFailCounters {
  return { ...counters };
}

/** True only when env is exactly "1" (ops opt-in). */
export function isTimingSchemaFailHealthEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return env[TIMING_SCHEMA_FAIL_HEALTH_ENV] === "1";
}

/** Test-only reset. */
export function resetTimingSchemaFailCounters(): void {
  counters.ambiguousAbsent = 0;
  counters.ambiguousBoolean = 0;
}